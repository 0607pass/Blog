+++
date = '2025-12-11T14:57:05+08:00'
draft = false
title = 'Redisson中的Watch Dog机制'

tags = ['Redis']
categories = ['Redis']
image = "images/postCover/redis.png"

+++

# Redisson中默认锁行为
```java
RLock lock = redisson.getLock("anyLock");
lock.lock();
```
1. 不指定过期时间；
2. 默认由看门狗机制控制锁的生命周期；
3. 默认锁过期时间为 30 秒；
4. 每 10 秒自动续期（即：每次重设为 30 秒后过期）。
## 为什么选择每10秒续期
1. 有容错，如何有网络异常导致第一次续期没有成功则还有2 机会。
2. 如果续期太频繁（如每 1 秒），会增加 Redis 的压力（频繁 PEXPIRE 调用）；
3. 如果续期太少（比如 25 秒才续期一次），容错空间太小，一旦某一次失败就会很危险。
## 默认过期时间30秒可以修改
> lockWatchdogTimeout 
> Redisson 会以 lockWatchdogTimeout / 3 的频率进行续期。
