+++
date = '2025-12-11T14:57:56+08:00'
draft = false
title = 'Redis中Hash数据结构，及rehash'
tags = ['Redis']
categories = ['Redis']
image = "images/postCover/redis.png"

+++

## Hash数据结构
```c
struct dict {
    dictType *type;

    /*指向两个ht_table 用来rehash */
    dictEntry **ht_table[2];
    unsigned long ht_used[2];

    long rehashidx; /* rehashing not in progress if rehashidx == -1 */

    /* Keep small vars at end for optimal (minimal) struct padding */
    int16_t pauserehash; /* If >0 rehashing is paused (<0 indicates coding error) */
    signed char ht_size_exp[2]; /* exponent of size. (size = 1<<exp) */
};
```

> dictType 干什么用的？

这是一个指针，指向另一个结构体 `dictType`，它定义了这个字典的“行为函数”，比如：

- 如何计算 key 的哈希值（`hashFunction`）
- 如何比较 key 是否相等（`keyCompare`）
- 如何释放内存（`keyDestructor`）

>  dictEntry **ht_table[2] 什么作用

这是一个数组，包含两个指针，每个指针指向一个“哈希桶数组”。

也就是说，Redis 的字典结构包含 **两个哈希表**

每个 `ht_table[i]` 是一个数组（数组里的每一项都是链表头 `dictEntry*`），用来处理哈希冲突。

## 为什么有两个哈希表？

为了支持 **渐进式 rehash（慢慢迁移，不一次迁移所有键）**。

- Redis 会先在 `ht_table[0]` 上工作。
- 当需要扩容或缩容时，会申请新的哈希表 `ht_table[1]`。
- 然后逐步把旧数据从 `ht_table[0]` 迁移到 `ht_table[1]`。

这样避免了暂停整个服务器做 rehash 的问题，提升响应性。

>  unsigned long ht_used[2]

这个数组记录了两个哈希表中实际存储了多少个键值对（节点）：

- `ht_used[0]`: 主表已用的 entry 数量
- `ht_used[1]`: 迁移目标表的 entry 数量（rehash 期间）

>  long rehashidx;

rehash 的**当前位置索引**：

- 如果等于 `-1`，表示当前没有在进行 rehash；
- 如果大于等于 `0`，说明正在进行 rehash，值表示当前已经迁移到哪一个桶。

Redis 每次执行命令时，会顺便迁移一小部分桶（渐进式迁移），通过这个变量跟踪进度。

>  int16_t pauserehash;

是否暂停 rehash 操作：

- `0`：正常
- `>0`：rehash 被暂时暂停（某些命令或操作期间）
- `<0`：表示有 bug，Redis 会报错（理论上不会出现）

>  signed char ht_size_exp[2];

表示两个哈希表的**大小的指数**：

- 哈希表的容量是 `2 的幂次方`，即：

  ```c
  
  size = 1 << ht_size_exp[i];
  ```

- 这比存储实际大小更节省空间，而且方便 Redis 使用位运算计算哈希值和桶位置。



#  哈希表的数据结构

```c
typedef struct dictEntry {
    void *key;
    union {
        void *val;
        uint64_t u64;
        int64_t s64;
        double d;
    } v;
    struct dictEntry *next;     /* Next entry in the same hash bucket. */
    void *metadata[];           /* An arbitrary number of bytes (starting at a
                                 * pointer-aligned address) of size as returned
                                 * by dictType's dictEntryMetadataBytes(). */
} dictEntry;
```

dictEntry 结构里键值对中的值是一个「联合体 v」定义的，因此，键值对中的值可以是一个指向实际值的指针，或者是一个无符号的 64 位整数或有符号的 64 位整数或double 类的值。这么做的好处是可以节省内存空间，因为当「值」是整数或浮点数时，就可以将值的数据内嵌在 dictEntry 结构里，无需再用一个指针指向实际的值，从而节省了内存空间。
