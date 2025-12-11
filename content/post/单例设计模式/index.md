+++
date = '2025-12-11T14:40:29+08:00'
draft = false
title = '单例设计模式'
categories = ['设计模式']
image = "images/postCover/design.png"
+++

# 什么是单例设计模式
单例模式（Singleton Pattern）是一种创建型设计模式，它就是说：一个类在整个应用运行期间，只能有一个实例，而且这个实例对外提供一个全局访问点。

## 单例模式的几种实现

### 1）饿汉式（Eager Initialization）

饿汉式是在类‎加载阶段就完成实例化，保⁢证从第一次访问该类到程序结束，全局只有这一个实例�。它依赖 JVM 的类加‎载机制来确保线程安全。

``` java
/**
 * @author 32500
 * @date 2025/6/9 10:19
 * 饿汉式单例模式
 */
public class SingletonEager {

    private  static SingletonEager instance =new SingletonEager();
    private SingletonEager(){

    }
    public  static SingletonEager getInstance(){
        return instance;
    }

}
```

### 2）懒汉式（Synchronized Lazy ）

   懒汉式在第一次调用 `getInstance()` 时才创建实例，通过对该方法加锁来保证线程安全，适合对启动性能有要求且实例不一定马上需要的场景。

```java
/**
 * @author 32500
 * @date 2025/6/9 10:30
 * 懒汉式单例模式
 * 每次调用 getInstance() 都会加锁，即使 instance 已经初始化完成，这会导致性能下降。
 * 采用双检锁优化
 */
public class SingletonLazy {

    private static SingletonLazy instance;

    private SingletonLazy(){

    }
    public static synchronized SingletonLazy getInstance(){
        if (instance==null){
            instance=new SingletonLazy();
        }
        return instance;
    }
}
```

### 3 ）双检锁 

```java
/**
 * @author 32500
 * @date 2025/6/9 10:35
 * 双检机制
 * 防止多线程重复判断
 */
public class DoubleCheckSingletonLazy {
    private static volatile DoubleCheckSingletonLazy instance;

    private DoubleCheckSingletonLazy(){

    }
    public static DoubleCheckSingletonLazy getInstance(){
        if (instance==null){
            synchronized (DoubleCheckSingletonLazy.class){
                if (instance==null){
                    return new DoubleCheckSingletonLazy();
                }
            }
        }
        return instance;
    }
}

```

### 4 ）静态内部类

```java
/**
 * @author 32500
 * @date 2025/6/9 11:10
 * 静态内部类实现单例模式
 * 利用 JVM 在加载外部类时并不立即加载内部类的特性，将实例的创建延迟到真正访问内部类时。既能延迟加载，又能借助类加载的线程安全特性。
 */
public class InnerStaticSingleton {

    static class Holder{
        private static final InnerStaticSingleton instance=new InnerStaticSingleton();
    }

    private InnerStaticSingleton(){
    }

    public static  InnerStaticSingleton getInstance(){
        return Holder.instance;
    }

}
```

### 5 ） 枚举 天然的单例

``` java
/**
 * @author 32500
 * @date 2025/6/9 11:13
 * 枚举实现 单例模式
 */
public enum EnumSingleton {
    INSTANCE;
}
```
