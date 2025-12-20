+++
date = '2025-12-20T10:19:03+08:00'
draft = false
title = 'Spring AI 1.1.0 集成 OpenGauss 向量数据库实现 RAG 检索'
tags = ['RAG','SpringAI']
categories = ['SpringAI']
image = "images/postCover/spring.png"
+++

# 1、前言

最近在做 RAG 项目时，发现很多人还在用 PGVector 或者 Milvus，其实国产数据库 OpenGauss 的向量能力已经相当成熟了。特别是它的向量索引和查询优化，在生产环境的表现比预期要好不少。

这篇文章主要记录一下如何用 Spring AI 1.1.0 集成 OpenGauss 的向量检索能力，以及 OpenGauss 在向量存储方面的一些特性。不搞那些虚的，直接上手干。

# 2、OpenGauss 向量数据库特性

## 2.1 向量类型支持

OpenGauss 原生支持三种向量类型，这个设计还挺有意思的：

```sql
-- 浮点向量，最常用，支持到 16000 维
CREATE TABLE docs (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    embedding VECTOR(1536)  -- OpenAI 嵌入维度
);

-- 位向量，适合二进制哈希
CREATE TABLE binary_index (
    id BIGINT,
    hash_bits BITVEC(1024)
);

-- 稀疏向量，适合高维稀疏场景
CREATE TABLE sparse_data (
    id BIGINT,
    features SPARSEVEC(1000000)  -- 理论维度很大，但非零元素最多 16000 个
);
```

实际项目中，`VECTOR` 类型用得最多，特别是配合 OpenAI 的 text-embedding-3-small 或者 bge-small 这类模型，1536 维刚刚好。

## 2.2 索引类型选择

OpenGauss 提供了四种向量索引，各有适用场景：

**IVFFLAT** - 简单粗暴，适合数据量不大（<100万）的场景
```sql
CREATE INDEX idx_ivfflat ON docs USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
```

**IVF-PQ** - 量化压缩，省内存但精度有损失
```sql
CREATE INDEX idx_ivf_pq ON docs USING ivfflat (embedding vector_l2_ops)
WITH (lists = 100, encoding = 'pq', encoding_params = 'dim=1536,subquant=8');
```

**HNSW** - 当前最火的图索引，查询快但构建慢
```sql
CREATE INDEX idx_hnsw ON docs USING hnsw (embedding vector_l2_ops)
WITH (m = 16, ef_construction = 200);
```

**HNSW-PQ** - HNSW + 量化，平衡型选择
```sql
CREATE INDEX idx_hnsw_pq ON docs USING hnsw (embedding vector_l2_ops)
WITH (m = 16, ef_construction = 200, encoding = 'pq');
```

生产环境建议：**HNSW** 是最稳妥的选择，虽然构建时间长点，但查询性能确实香。

## 2.3 相似度计算

OpenGauss 支持三种距离算法：

```sql
-- L2 距离（欧氏距离），数值越小越相似
SELECT * FROM docs ORDER BY embedding <-> '[0.1,0.2,...]' LIMIT 5;

-- 余弦距离，数值越小越相似（注意是距离，不是相似度）
SELECT * FROM docs ORDER BY embedding <=> '[0.1,0.2,...]' LIMIT 5;

-- 内积，数值越大越相似
SELECT * FROM docs ORDER BY embedding <#> '[0.1,0.2,...]' LIMIT 5;
```

如果是用 OpenAI 或者 BGE 系列的嵌入向量，推荐用余弦距离（`<=>`），因为这些模型训练时就是优化余弦相似度。

# 3、Spring AI 1.1.0 集成实战

## 3.1 依赖配置

Spring AI 1.1.0 对 OpenGauss 的支持还在完善中，目前需要通过 JDBC 方式接入：

```xml
<dependencies>
    <!-- Spring AI 核心 -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-core</artifactId>
        <version>1.1.0</version>
    </dependency>

    <!-- 数据库连接 -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <version>42.7.2</version>
    </dependency>

    <!-- 连接池 -->
    <dependency>
        <groupId>com.zaxxer</groupId>
        <artifactId>HikariCP</artifactId>
    </dependency>
</dependencies>
```

注意：OpenGauss 的 JDBC 驱动和 PostgreSQL 兼容，直接用 PG 的驱动就行。

## 3.2 向量存储实现

Spring AI 的 `VectorStore` 接口需要自己实现，这里给个完整的例子：

```java
@Component
public class OpenGaussVectorStore implements VectorStore {

    private final JdbcTemplate jdbcTemplate;
    private final EmbeddingClient embeddingClient;

    public OpenGaussVectorStore(JdbcTemplate jdbcTemplate,
                               EmbeddingClient embeddingClient) {
        this.jdbcTemplate = jdbcTemplate;
        this.embeddingClient = embeddingClient;
    }

    @Override
    public void add(List<Document> documents) {
        for (Document doc : documents) {
            // 生成嵌入向量
            float[] embedding = embeddingClient.embed(doc.getText());

            // 存入数据库
            jdbcTemplate.update(
                "INSERT INTO documents (content, embedding, metadata) VALUES (?, ?, ?)",
                doc.getText(),
                new Vector(embedding),
                doc.getMetadata().toString()
            );
        }
    }

    @Override
    public List<Document> similaritySearch(SearchRequest request) {
        float[] queryEmbedding = embeddingClient.embed(request.getQuery());

        String sql = """
            SELECT id, content, metadata, embedding <=> ? as distance
            FROM documents
            ORDER BY embedding <=> ?
            LIMIT ?
            """;

        return jdbcTemplate.query(sql,
            (rs, rowNum) -> {
                Document doc = new Document(rs.getString("content"));
                doc.getMetadata().put("id", rs.getLong("id"));
                doc.getMetadata().put("distance", rs.getFloat("distance"));
                return doc;
            },
            new Vector(queryEmbedding),
            new Vector(queryEmbedding),
            request.getTopK()
        );
    }

    @Override
    public void delete(List<String> docIds) {
        String sql = "DELETE FROM documents WHERE id = ?";
        for (String id : docIds) {
            jdbcTemplate.update(sql, Long.parseLong(id));
        }
    }
}
```

这里有个小坑：Spring AI 的 `Vector` 类型需要自己处理，OpenGauss 的 JDBC 驱动对向量类型支持还不够完善，建议用 `float[]` 数组配合自定义类型处理器。

## 3.3 RAG 服务封装

有了向量存储，RAG 服务就简单了：

```java
@Service
public class RagService {

    private final OpenGaussVectorStore vectorStore;
    private final ChatClient chatClient;

    public RagService(OpenGaussVectorStore vectorStore, ChatClient chatClient) {
        this.vectorStore = vectorStore;
        this.chatClient = chatClient;
    }

    public String query(String question) {
        // 1. 向量检索
        List<Document> documents = vectorStore.similaritySearch(
            SearchRequest.query(question).withTopK(5)
        );

        // 2. 构建提示词
        String context = documents.stream()
            .map(Document::getText)
            .collect(Collectors.joining("\n\n"));

        String prompt = String.format("""
            基于以下上下文信息回答问题：

            上下文：
            %s

            问题：%s

            请给出准确、简洁的回答。
            """, context, question);

        // 3. 调用大模型
        return chatClient.call(prompt);
    }

    // 批量导入文档
    public void importDocuments(List<String> texts) {
        List<Document> docs = texts.stream()
            .map(text -> new Document(text))
            .collect(Collectors.toList());
        vectorStore.add(docs);
    }
}
```

# 4、性能优化实践

## 4.1 索引调优

在实际测试中，HNSW 索引的参数调优很关键：

```sql
-- m: 每个节点的邻居数，越大越精确但索引越大，通常 16-32
-- ef_construction: 构建时的搜索范围，越大质量越好但构建慢
CREATE INDEX idx_hnsw_optimized ON documents USING hnsw (embedding vector_l2_ops)
WITH (m = 24, ef_construction = 300);

-- 查询时的扩展因子，越大越精确但查询慢
SET hnsw.ef_search = 100;
```

实测数据：100万条向量，m=24, ef_construction=300 时，查询延迟在 10-20ms，召回率 95%+。

## 4.2 批量操作优化

向量插入是性能瓶颈，建议批量处理：

```java
public void batchAdd(List<Document> documents, int batchSize) {
    List<List<Document>> batches = Lists.partition(documents, batchSize);

    for (List<Document> batch : batches) {
        jdbcTemplate.batchUpdate(
            "INSERT INTO documents (content, embedding) VALUES (?, ?)",
            new BatchPreparedStatementSetter() {
                @Override
                public void setValues(PreparedStatement ps, int i) throws SQLException {
                    Document doc = batch.get(i);
                    float[] embedding = embeddingClient.embed(doc.getText());
                    ps.setString(1, doc.getText());
                    ps.setObject(2, new Vector(embedding));
                }

                @Override
                public int getBatchSize() {
                    return batch.size();
                }
            }
        );
    }
}
```

## 4.3 冷热分离

对于超大规模数据，可以考虑冷热分离：

```sql
-- 热数据：最近 7 天，用 HNSW 索引
CREATE TABLE documents_hot (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_hnsw_hot ON documents_hot USING hnsw (embedding vector_l2_ops);

-- 冷数据：历史数据，用 IVFFLAT 索引省内存
CREATE TABLE documents_cold (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMP
);
CREATE INDEX idx_ivfflat_cold ON documents_cold USING ivfflat (embedding vector_l2_ops) WITH (lists = 500);
```

查询时先查热表，结果不足再查冷表。

# 5、踩坑记录

## 5.1 向量维度不匹配

OpenGauss 创建表时指定了向量维度，插入时必须严格匹配：

```sql
-- 错误：维度不匹配
CREATE TABLE docs (embedding VECTOR(768));
INSERT INTO docs VALUES ('[0.1,0.2]');  -- 2维，报错

-- 正确：维度一致
CREATE TABLE docs (embedding VECTOR(1536));
INSERT INTO docs VALUES (ARRAY[0.1,0.2,...]::float[]);  -- 1536维
```

## 5.2 驱动兼容性问题

OpenGauss 的向量类型在标准 PG 驱动中不被识别，需要特殊处理：

```java
// 自定义类型处理器
public class VectorTypeHandler implements TypeHandler<float[]> {
    @Override
    public void setParameter(PreparedStatement ps, int i, float[] parameter, JdbcType jdbcType) throws SQLException {
        // 转换为 PostgreSQL 数组格式
        String arrayStr = Arrays.toString(parameter).replace("[", "{").replace("]", "}");
        ps.setObject(i, arrayStr, Types.OTHER);
    }

    @Override
    public float[] getResult(ResultSet rs, String columnName) throws SQLException {
        String arrayStr = rs.getString(columnName);
        return parseVector(arrayStr);
    }
}
```

## 5.3 内存占用

HNSW 索引虽然查询快，但内存占用不小。100万条 1536 维向量，大约需要 8-10GB 内存。如果内存紧张，可以考虑：

- 用 IVF-PQ 压缩
- 降低向量维度（用 PCA 降维）
- 分片存储

# 6、总结

OpenGauss 的向量能力确实不错，特别是 HNSW 索引的性能表现。和 Spring AI 集成时，主要工作量在 JDBC 驱动适配和类型处理上。

相比其他向量数据库，OpenGauss 的优势在于：
- 原生 SQL 支持，学习成本低
- 事务一致性，数据可靠性高
- 国产化，合规性好

缺点是生态还在完善中，一些高级功能需要自己造轮子。

对于想在现有系统中加入 RAG 能力的团队，OpenGauss 是个不错的选择，特别是已经在用 PG 或者 OpenGauss 的场景，迁移成本很低。

代码示例和完整项目结构，可以参考上面的实现思路，根据具体业务调整即可。