+++
date = '2025-12-11T14:54:01+08:00'
draft = false
title = 'Redis有哪些巧妙的设计，举几个例子'

tags = ['Redis']
categories = ['Redis']
image = "images/postCover/redis.png"

+++

# 5个方面 

**线程模型、数据结构、共享对象池、过期设计、数据持久化设计**

## 一、线程模型

Redis 使用**单线程模型**来处理所有的客户端请求。

虽然看似单线程简单，但这种设计减少了上下文切换和锁的开销，避免了多线程编程中的复杂性。

并且通过**多路复用**（epoll、select 等）+ **事件驱动**机制，Redis 仍然能够处理大量的并发连接。

## 二、数据结构

Redis 对很多数据结构进行了优化，例如 sds、ziplist，还有哈希表的扩容机制。

### SDS(Simple Dynamic String)

```c
struct __attribute__ ((__packed__)) sdshdr16 {
    uint16_t len; /* used */
    uint16_t alloc; /* excluding the header and null terminator */
    unsigned char flags; /* 3 lsb of type, 5 unused bits */
    char buf[];
};
```



1. **动态扩展和空间预分配**：SDS 支持自动扩展。当字符串长度增加时，SDS 会自动分配更大的内存空间，并且通常会额外预留一部分空间，减少频繁的内存分配操作，这样就避免了每次修改字符串时都需要重新分配内存的开销。
2. **二进制安全:**  与 C 字符串不同，SDS 支持存储二进制数据，因为它不会依赖于空字符（'\0'）来标识字符串的结束。这使得 SDS 可以安全地存储和处理任意二进制数据。
3. **常数时间获取字符串的长度** ：SDS 结构中会额外存储字符串的当前长度，这使得获取字符串长度的操作可以在 O(1) 时间内完成，而不像 C 字符串那样需要遍历整个字符串来计算长度。
4. **防止缓冲区溢出**：SDS 通过维护分配空间的总长度和已用长度，能够有效防止缓冲区溢出问题。这在使用 C 字符串时是一个常见的安全隐患，但在 SDS 中得到了很好解决。
5. **惰性空间释放** ： 当 SDS 中的字符串长度缩短时，并不会立即缩减内存空间，而是会保留部分缩短后的空间，这样可以避免频繁的内存重新分配操作。这种策略也是 Redis 的内存优化的一部分。

### ziplist(压缩列表)

压缩列表（ziplist）是 Redis 用于实现列表和哈希表的底层数据结构之一。

当列表或哈希表中的数据量较小，且元素长度较短时，Redis 会选择使用压缩列表来存储数据，**达到节省内存消耗的目的**。

关键设计如下：

- 内存紧凑：压缩列表将所有元素紧凑地存储在一段连续的内存空间中，没有指针等额外开销。每个元素前都有一个前向编码和后向编码，用于指示前一个元素的长度，这样可以快速地进行前后遍历，避免了链表中指针的额外开销。

- 灵活性：压缩列表根据存储的元素长度动态调整编码方式，小于 1 字节的整数、1 字节的整数、3 字节的整数等不同长度的编码方式，能够极大地节省内存。

- 性能与空间的平衡：当列表或哈希表变得很大时，Redis 会自动切换到更高效的链表或哈希表结构。这种按需调整的数据结构设计，确保了在不同场景下的性能最优。

  #### 整体结构布局

  ```
  area |<---- ziplist header ---->|<----------- entries ------------->|<-end->|
  size    4 bytes  4 bytes  2 bytes      ?        ?        ?      1 byte
      +---------+--------+-------+--------+--------+--------+-------+
      | zlbytes | zltail | zllen | entry1 | entry2 | ...    | zlend |
      +---------+--------+-------+--------+--------+--------+-------+
  ```

  ####Header 部分详解

  | 字段名  | 长度/类型        | 作用                                                         |
  | ------- | ---------------- | ------------------------------------------------------------ |
  | zlbytes | uint32_t (4字节) | 整个 ziplist 占用的内存字节数，用于内存重分配和计算末端      |
  | zltail  | uint32_t (4字节) | 到达 ziplist 表尾节点的偏移量，可以直接定位到尾节点          |
  | zllen   | uint16_t (2字节) | ziplist 中节点的数量。当值小于 65535 时为实际数量；等于 65535 时需要遍历计算 |
  | zlend   | uint8_t (1字节)  | 值为 255(0xFF)，标记 ziplist 的末端                          |

```c
/* We use this function to receive information about a ziplist entry.
 * Note that this is not how the data is actually encoded, is just what we
 * get filled by a function in order to operate more easily. */
typedef struct zlentry {
    unsigned int prevrawlensize; /* Bytes used to encode the previous entry len*/
    unsigned int prevrawlen;     /* Previous entry len. */
    unsigned int lensize;        /* Bytes used to encode this entry type/len.
                                    For example strings have a 1, 2 or 5 bytes
                                    header. Integers always use a single byte.*/
    unsigned int len;            /* Bytes used to represent the actual entry.
                                    For strings this is just the string length
                                    while for integers it is 1, 2, 3, 4, 8 or
                                    0 (for 4 bit immediate) depending on the
                                    number range. */
    unsigned int headersize;     /* prevrawlensize + lensize. */
    unsigned char encoding;      /* Set to ZIP_STR_* or ZIP_INT_* depending on
                                    the entry encoding. However for 4 bits
                                    immediate integers this can assume a range
                                    of values and must be range-checked. */
    unsigned char *p;            /* Pointer to the very start of the entry, that
                                    is, this points to prev-entry-len field. */
} zlentry;

```

#### 渐进式 rehash

Redis 的哈希表在扩容或缩容时不会一次性进行全量 rehash。

相反，它采取了**渐进式 rehash 的方式**，将 rehash 操作分摊到后续的增删改查操作中，从而避免了集中的性能抖动。

## 3、共享对象池

Redis 中有许多常用的小整数，例如 0 到 9999。这些整数频繁地出现在各种命令和数据操作中。

为了减少内存分配和释放的开销，Redis 使用了 **共享对象池（Shared Object Pool）**，实现了：

- 对象复用：对于常用的小整数，Redis 会在启动时预先创建这些对象，并将它们存储在一个共享对象池中。当系统需要这些整数对象时，直接从池中获取，而不需要重复分配内存。这大大减少了内存分配和释放的开销，提高了系统的效率。

- 内存节省：共享对象池有效地节省了内存，尤其是在大规模使用这些常量的场景中。通过对象复用，避免了频繁的内存申请和垃圾回收。

## 4、过期设计

Redis 支持为键设置过期时间。当键过期后，它应该被自动删除。

然而，过期键的处理需要在性能和准确性之间找到平衡。Redis 采用了一种 **惰性删除与定期删除相结合的策略** 来处理过期键：

- 惰性删除：当客户端访问一个键时，Redis 会检查该键是否已经过期。如果过期，则立即删除。这种方式不会增加系统负担，因为只在访问时才检查键的状态。
- 定期删除：Redis 每隔一段时间会随机抽取一部分键进行过期检查，并删除其中已过期的键。通过这种方式，Redis 可以避免系统中大量存在过期键而无法及时清理的情况。

惰性删除确保访问性能，定期删除避免内存泄漏。通过惰性删除和定期删除相结合，Redis 实现了过期键的高效管理。

## 5、数据持久化：AOF 重写机制

AOF（Append Only File） 是 Redis 的一种数据持久化方式。

Redis 会将所有写操作以追加的方式记录到 AOF 文件中，以保证数据的安全性。然而，**随着时间推移，AOF 文件可能会变得非常大**，影响恢复速度。

为了解决这个问题，Redis 引入了 **AOF 重写（AOF Rewrite）** 机制：

- 增量重写：AOF 重写并不会中断正常的写操作。在重写期间，Redis 仍然可以将新的写操作继续追加到旧的 AOF 文件中，确保了高并发写入时的持久化性能。
- 空间优化：AOF 重写过程中，Redis 并不会简单地复制所有命令，而是根据当前的数据状态，生成最精简的命令集。即使一个键值经过多次修改，最终的 AOF 文件中只会保留一条最有效的命令，从而大幅减少了文件大小。
- 异步执行：AOF 重写是通过子进程异步执行的，主进程不会受到影响，这保证了在执行重写的同时，Redis 仍然可以提供高效的服务。

😂😂😂
