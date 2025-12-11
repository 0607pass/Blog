+++
date = '2025-12-09T20:53:37+08:00'
draft = false
title = '什么是TCP的粘包、拆包问题？'
tags = ['TCP']
categories = ['计算机网络']
image = "images/postCover/network.png"
+++
TCP粘包和拆包问题是指在进行TCP通信时，而TCP是面向流的，所以发送方在传输数据时可能会将多个小的数据包粘合在一起发送，而接收方则可能将这些数据包拆分成多个小的数据包进行接收，从而导致数据接收出现错误或者数据粘连的问题。
TCP粘包和拆包问题主要出现在以下两种情况下：

1. 发送方连续发送多个小数据包：由于TCP是基于流的协议，发送方在传输数据时可能会将多个小数据包组合成一个大数据包进行发送，从而导致接收方在接收数据时无法区分不同数据包之间的界限。
2. 接收方缓存区大小限制：接收方在接收数据时，如果接收缓存区的大小有限，可能会将一个大的数据包拆分成多个小数据包进行接收，从而导致粘包和拆包问题的出现。

## 如何解决？？？
对包格式进行约束：
1. 将业务层协议包的长度固定下来，每个包都固定长度，比如512个字节大小，如果客户端发送的数据长度不足512个字节，则通过补充空格的方式补全到指定长度；
2. 在每个包的末尾使用固定的分隔符，如换行符/n，如果一个包被拆分了，则等待下一个包发送过来之后找到其中的\n，然后对其拆分后的头部部分与前一个包的剩余部分进行合并即可；
3. 仿照TCP/IP协议栈，将消息分为header和body，在head中保存有当前整个消息的长度，只有在读取到足够长度的消息之后才算是读到了一个完整的消息；
4. 通过自定义协议进行粘包和拆包的处理。
## Netty如何解决的？
以下是基于上述第3点实现的
```java
/**
 * Create a frame out of the {@link ByteBuf} and return it.
 *
 * @param ctx  the {@link ChannelHandlerContext} which this {@link ByteToMessageDecoder} belongs to
 * @param in   the {@link ByteBuf} from which to read data
 * @return     the {@link ByteBuf} frame, or {@code null} if no frame could be created.
 */
protected Object decode(ChannelHandlerContext ctx, ByteBuf in) throws Exception {
    long frameLength = 0;

    // frameLengthInt 是类的成员变量，用于记录当前待切帧的 “目标帧总长度”
    // 初始化为 -1 表示 “还没确定当前帧长度 (new frame)”
    if (frameLengthInt == -1) { // new frame

        // 若之前处于丢弃模式，先执行丢弃逻辑
        if (discardingTooLongFrame) {
            discardingTooLongFrame(in);
        }

        // 缓冲区未到达长度字段结束位置，无法得出帧长 → 等待更多字节
        if (in.readableBytes() < lengthFieldEndOffset) {
            return null;
        }

        // 计算长度字段在缓冲区中的真实偏移
        int actualLengthFieldOffset = in.readerIndex() + lengthFieldOffset;

        // 读取原始长度值
        frameLength = getUnadjustedFrameLength(
                in, actualLengthFieldOffset, lengthFieldLength, byteOrder);

        // 长度值不能为负
        if (frameLength < 0) {
            failOnNegativeLengthField(in, frameLength, lengthFieldEndOffset);
        }

        // 加上 lengthAdjustment 和 header 长度（lengthFieldEndOffset）
        frameLength += lengthAdjustment + lengthFieldEndOffset;

        // 校验：整帧长度不应小于 header
        if (frameLength < lengthFieldEndOffset) {
            failOnFrameLengthLessThanLengthFieldEndOffset(
                    in, frameLength, lengthFieldEndOffset);
        }

        // 校验：帧是否超过最大大小
        if (frameLength > maxFrameLength) {
            exceededFrameLength(in, frameLength);
            return null;
        }

        // 保存最终帧长度（不会溢出，因为已保证 < maxFrameLength）
        frameLengthInt = (int) frameLength;
    }

    // 当前帧长度已确定，检查是否收到全部数据
    if (in.readableBytes() < frameLengthInt) {
        // 数据不足 → 半包 → 等待更多字节
        return null;
    }

    // 校验：strip 的字节不应超过帧长度
    if (initialBytesToStrip > frameLengthInt) {
        failOnFrameLengthLessThanInitialBytesToStrip(
                in, frameLength, initialBytesToStrip);
    }

    // 跳过 initialBytesToStrip 字节（通常是跳过 header/length-field）
    in.skipBytes(initialBytesToStrip);

    // extract frame
    int readerIndex = in.readerIndex();
    int actualFrameLength = frameLengthInt - initialBytesToStrip;

    ByteBuf frame = extractFrame(ctx, in, readerIndex, actualFrameLength);

    // 移动 readerIndex，跳过整帧
    in.readerIndex(readerIndex + actualFrameLength);

    // 重置，准备下一帧
    frameLengthInt = -1;

    return frame;
}
```
还有 FixedLengthFrameDecoder (固定包长) DelimiterBasedFrameDecoder(基于分隔符)

## UDP有没有这种情况
不会出现，因为 UDP 是基于“数据报（Datagram）”的消息协议。
UDP特性：
* 有消息边界
* 一次读取永远对应一次 sendto() 的包
* 要么整包收到
* 要么丢包
* 不会粘，不会拆