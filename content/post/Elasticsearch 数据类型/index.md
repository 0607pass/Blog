+++
date = '2026-01-04T21:17:02+08:00'
draft = false
title = 'Elasticsearch 数据类型'
tags = ['Elasticsearch']
categories = ['中间件']
image = "images/postCover/es.png"
+++

## **Elasticsearch 数据类型**
在 Elasticsearch 中，数据类型 决定了字段的存储和索引方式，以及它们支持的查询类型和操作方式。正确理解和选择数据类型，是设计高效索引和搜索的重要前提。

### 数据类型分类
Elasticsearch 的字段数据类型主要分为以下几类：
* 基本数据类型：数值、字符串、布尔值等。
* 复杂数据类型：如对象、嵌套对象。
* 地理数据类型：用于存储和搜索地理位置相关的数据。
* 特殊数据类型：专门为特定场景设计的数据类型，如 IP 地址、范围类型等。

这份关于 Elasticsearch 数据类型的整理已经按照 Markdown 格式进行了优化，增加了清晰的层级结构、代码块标注以及对比说明，方便你直接阅读或存档。

---


## 1. 基本数据类型

### 文本类型

| 类型 | 描述 | 应用场景 |
| --- | --- | --- |
| **`text`** | 用于全文搜索。支持分词（Analysis）并建立倒排索引。 | 邮件正文、笔记标题、产品描述。 |
| **`keyword`** | 用于精确匹配。不参与分词，直接建立索引。 | 状态码（OK/Fail）、分类标签、邮编、ID。 |

**示例定义：**

```json
"mappings": {
  "properties": {
    "title": { "type": "text" },
    "status": { "type": "keyword" }
  }
}

```

### 数值类型

* **整型**：`integer` (32位), `long` (64位), `short` (16位), `byte` (8位)。
* **浮点型**：`double` (双精度), `float` (单精度), `half_float`, `scaled_float`。

**示例定义：**

```json
"age": { "type": "integer" },
"price": { "type": "double" }

```

### 布尔与日期

* **`boolean`**：存储 `true` 或 `false`。
* **`date`**：存储日期和时间。默认支持 ISO 8601 格式，也可以自定义格式。

**示例定义：**

```json
"created_at": {
  "type": "date",
  "format": "yyyy-MM-dd HH:mm:ss||epoch_millis"
}

```

---

## 2. 复杂数据类型

### 对象类型 (`object`)

用于存储单个 JSON 对象。在 ES 内部会被扁平化处理。

```json
"user": {
  "type": "object",
  "properties": {
    "name": { "type": "text" },
    "age": { "type": "integer" }
  }
}

```

### 嵌套类型 (`nested`)

**重要**：如果需要存储“对象数组”并保持对象内字段的关联性，必须使用 `nested`。

```json
"comments": {
  "type": "nested",
  "properties": {
    "author": { "type": "keyword" },
    "content": { "type": "text" }
  }
}

```

---

## 3. 地理数据类型

* **`geo_point`**：存储经纬度坐标对。支持距离排序、地理围栏查询。
* *示例数据*：`"location": { "lat": 40.71, "lon": -74.00 }`


* **`geo_shape`**：存储复杂的几何图形（如多边形 `Polygon`、线条 `LineString`）。
* *示例场景*：行政区划边界、航线轨迹。



---

## 4. 特殊数据类型

### IP 地址 (`ip`)

支持 IPv4 和 IPv6，允许针对 IP 段进行搜索（CIDR 检索）。

```json
"client_ip": { "type": "ip" }

```

### 范围类型 (`range`)

存储一个区间值。

* **子类型**：`integer_range`, `float_range`, `long_range`, `date_range`, `ip_range`。
* **数据示例**：
```json
"price_range": {
  "gte": 100,
  "lte": 200
}

```



---

## 总结与建议

| 需求 | 推荐类型 |
| --- | --- |
| 需要分词搜索 | `text` |
| 需要聚合（Aggregation）或排序 | `keyword` 或数值类型 |
| 存储 JSON 对象且需要独立查询数组成员 | `nested` |
| 存储经纬度 | `geo_point` |


> 1. **多字段配置**：同一个字段可以既是 `text`（用于搜索）又是 `keyword`（用于聚合）。
> 2. **明确定义**：尽量避免依靠 ES 的动态映射（Dynamic Mapping），手动定义 Mapping 能更好地控制存储空间和索引效率。
> 
> 