+++
date = '2025-12-20T16:05:28+08:00'
draft = true
title = 'CompletableFuture 介绍以及基本使用方法'
+++

`CompletableFuture` 是 `Future` 的一个扩展，能够简化异步编程。它允许你更容易地组合和变换任务的结果，并提供了丰富的 API 来处理错误和取消操作。

创建一个 CompletableFuture 的常见方式是通过静态工厂方法，如 supplyAsync 或 runAsync。下面是一个简单的示例：

```java 
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

public class CompletableFutureExample {

    public static void main(String[] args) throws ExecutionException, InterruptedException {
        CompletableFuture<Integer> future = CompletableFuture.supplyAsync(() -> {
            // 模拟一个耗时的任务
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return 42; // 返回任务的结果
        });

        // 等待任务完成
        Integer result = future.get();
        System.out.println("Result: " + result);
    }
}
```
## 链式调用
CompletableFuture 的一大优点是支持链式调用，这意味着你可以很容易地将多个异步操作链接在一起。下面是一个使用 thenApply 和 thenCompose 方法的示例：
```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

public class CompletableFutureChainExample {

    public static void main(String[] args) throws ExecutionException, InterruptedException {
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> "Hello")
            .thenApply(s -> s.toUpperCase()) // 转换成大写
            .thenCompose(s -> CompletableFuture.supplyAsync(() -> s + " World!")); // 组合字符串

        String result = future.get();
        System.out.println("Result: " + result);
    }
}
```

## 错误处理
CompletableFuture 提供了几种方法来处理异常情况，包括 exceptionally 和 handle 方法：
```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

public class CompletableFutureErrorHandling {

    public static void main(String[] args) throws ExecutionException, InterruptedException {
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
                    if (Math.random() < 0.5) { // 获取一个随机数，若小于 0.5， 则抛出运行时异常
                        throw new RuntimeException("Something went wrong!");
                    }
                    return "Success!"; // 否则，返回 Success
                })
                .exceptionally(e -> { // 处理异常
                    System.out.println("Caught exception: " + e.getMessage());
                    return "Error occurred";
                });

        String result = future.get();
        System.out.println("Result: " + result);
    }
}
```
## 取消操作
```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

public class CompletableFutureCancellation {

    public static void main(String[] args) throws ExecutionException, InterruptedException {
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return "Done!";
        });

        future.cancel(true); // 尝试取消任务

        try {
            String result = future.get();
            System.out.println("Result: " + result);
        } catch (CancellationException e) {
            System.out.println("Task was cancelled.");
        }
    }
}
```

项目的使用
```java
 // 并发查询优化
        // RPC: 调用用户服务
        Long creatorId = noteDO.getCreatorId();
        CompletableFuture<FindUserByIdRspDTO> userResultFuture = CompletableFuture
                .supplyAsync(() -> userRpcService.findById(creatorId), threadPoolTaskExecutor);

        // RPC: 调用 K-V 存储服务获取内容
        CompletableFuture<String> contentResultFuture = CompletableFuture.completedFuture(null);
        if (Objects.equals(noteDO.getIsContentEmpty(), Boolean.FALSE)) {
            contentResultFuture = CompletableFuture
                    .supplyAsync(() -> keyValueRpcService.findNoteContent(noteDO.getContentUuid()), threadPoolTaskExecutor);
        }

        CompletableFuture<String> finalContentResultFuture = contentResultFuture;
        CompletableFuture<FindNoteDetailRspVO> resultFuture = CompletableFuture
                .allOf(userResultFuture, contentResultFuture)
                .thenApply(s -> {
                    // 获取 Future 返回的结果
                    FindUserByIdRspDTO findUserByIdRspDTO = userResultFuture.join();
                    String content = finalContentResultFuture.join();

                    // 笔记类型
                    Integer noteType = noteDO.getType();
                    // 图文笔记图片链接(字符串)
                    String imgUrisStr = noteDO.getImgUris();
                    // 图文笔记图片链接(集合)
                    List<String> imgUris = null;
                    // 如果查询的是图文笔记，需要将图片链接的逗号分隔开，转换成集合
                    if (Objects.equals(noteType, NoteTypeEnum.IMAGE_TEXT.getCode())
                            && StringUtils.isNotBlank(imgUrisStr)) {
                        imgUris = List.of(imgUrisStr.split(","));
                    }

                    // 构建返参 VO 实体类
                    return FindNoteDetailRspVO.builder()
                            .id(noteDO.getId())
                            .type(noteDO.getType())
                            .title(noteDO.getTitle())
                            .content(content)
                            .imgUris(imgUris)
                            .topicId(noteDO.getTopicId())
                            .topicName(noteDO.getTopicName())
                            .creatorId(noteDO.getCreatorId())
                            .creatorName(findUserByIdRspDTO.getNickName())
                            .avatar(findUserByIdRspDTO.getAvatar())
                            .videoUri(noteDO.getVideoUri())
                            .updateTime(noteDO.getUpdateTime())
                            .visible(noteDO.getVisible())
                            .build();

                });

        // 获取拼装后的 FindNoteDetailRspVO
        FindNoteDetailRspVO findNoteDetailRspVO = resultFuture.get();
```


