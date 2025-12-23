+++
date = '2025-12-21T10:14:19+08:00'
draft = false
title = '红包生成算法'
+++

## 二倍均值法
特点：
* 实现简单
* 不会超发、少发
* 有随机性
* 金额分布自然，不极端
潜在问题： 可能出现“前面很大，后面很小”
代码示例：
```java
    /**
     * 生成红包金额List集合数据
     *
     * @param totalPrice
     * @param totalCount
     */
private List<Integer> createRedPacketPriceList(Integer totalPrice, Integer totalCount) {
    List<Integer> redPacketPriceList = new ArrayList<>(totalCount);
    for (int i = 0; i < totalCount; i++) {
        //如果是最后一个红包
         if (totalCount == i + 1) {
            redPacketPriceList.add(totalPrice);
            break;
        }
        int maxLimit = ((totalPrice / (totalCount - i)) * 2);
        int currentPrice = ThreadLocalRandom.current().nextInt(1, maxLimit);
        totalPrice -= currentPrice;
        redPacketPriceList.add(currentPrice);
    }
        return redPacketPriceList;
}
```

