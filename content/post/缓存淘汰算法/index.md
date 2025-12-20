+++
date = '2025-12-20T15:06:42+08:00'
draft = false
title = '缓存淘汰算法'
+++

缓存淘汰算法（Cache eviction policies）是指在计算机科学中用于决定当缓存满时应该移除哪些数据项以腾出空间的策略。以下是一些常见的缓存淘汰算法及说明：
## 1、先进先出（FIFO, First-In-First-Out）：
* 原理：最先进入缓存的数据最先被移除。
* 优点：实现简单。
* 缺点：不考虑数据项的重要性或使用频率，可能导致经常使用的数据被频繁替换出去。
## 2、最近最少使用（LRU, Least Recently Used）：
* 原理：最近最少使用的数据项将被首先移除。
* 优点：较好地反映了数据的访问模式，即最近被访问过的数据很可能再次被访问。
* 缺点：维护“最近使用”的状态需要额外的空间和计算资源。
> 举个例子
> 假设容量为 ：3
> 访问顺序： A → B → C → A → D
> 
| 步骤 | 缓存内容  | 说明            |
| -- | ----- | ------------- |
| A  | A     |               |
| B  | A B   |               |
| C  | A B C |               |
| A  | B C A | A 最近访问，移到“最新” |
| D  | C A D | B 最久未访问，被淘汰   |
淘汰B
> 实现方式：HashMap + 双向链表
## 3、最不经常使用（LFU, Least Frequently Used）：
* 原理：最不经常使用的数据项被优先移除。
* 优点：能够根据数据的使用频率做出更合理的决策。
* 缺点：需要维护每个数据项的使用计数，增加了实现复杂度。
> 举个例子
> 假设容量为 ：3
> A → A → B → C → D
> 
| 数据 | 次数 |
| -- | -- |
| A  | 2  |
| B  | 1  |
| C  | 1  |

插入 D 时 淘汰 B  (B、C)次数一样，优先淘汰最早进来的
> 实现方式： HashMap + 频率链表

# Redis中的内存淘汰策略是什么？

Redis 的淘汰策略由配置项控制：
``` conf
maxmemory-policy <policy>
```

主要分为3 大类
1. noeviction（默认）： 即不淘汰任何key  内存满了之后，写请求报错，读请求正常
2. volatile（只淘汰设置了过期时间的 key）
   * volatile-lru
   * volatile-lfu
   * volatile-random
   * volatile-ttl
3. allkeys（可以淘汰所有 key）
   1. allkeys-lru（ 常用）
   2. allkeys-lfu（ Redis 4.0+ 推荐）
   3. allkeys-random

**Redis中的  LFU 是如何实现的？？**

核心数据结构：
``` c
typedef struct redisObject {
    unsigned type:4;
    unsigned encoding:4;
    unsigned lru:LRU_BITS; /* LRU time (relative to global lru_clock) or
                            * LFU data (least significant 8 bits frequency
                            * and most significant 16 bits access time). */
    int refcount;
    void *ptr;
} robj;
```




