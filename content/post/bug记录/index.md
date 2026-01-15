+++
date = '2026-01-09T15:20:36+08:00'
draft = true
title = 'Bug记录'
+++

 ---
  记一次 SSE 流式接口与 Spring Security 鉴权冲突的排查与解决

  场景：在开发 AI 对话功能时遇到的 Spring Security + SSE 鉴权问题

  背景介绍

  最近在公司实习，负责开发一个 AI 智能体对话功能。技术栈是 Spring Boot + Spring Security + Spring AI，前端使用 SSE（Server-Sent Events）接收 AI 的流式回复。

  功能开发得很顺利，本地测试一切正常。但部署到测试环境后，测试同学反馈了一个奇怪的问题：每次对话正常结束后，后端控制台都会报一大堆红色的异常日志。


  问题现象

  复现步骤

  1. 用户登录后发起 AI 对话请求
  2. AI 流式回复正常返回，前端正常显示
  3. 对话结束后，后端控制台报错

  错误日志

  [boundedElastic-1] INFO  - ## 流式响应完成
  [http-nio-9080-exec-3] ERROR o.a.c.c.C.[.[.[.[dispatcherServlet] - Servlet.service() threw exception
  org.springframework.security.authorization.AuthorizationDeniedException: Access Denied
      at org.springframework.security.web.access.intercept.AuthorizationFilter.doFilter(AuthorizationFilter.java:99)
  ...
  Caused by: Unable to handle the Spring Security Exception because the response is already committed

  关键信息

  - boundedElastic-1 线程：流式响应正常完成
  - http-nio-9080-exec-3 线程：响应完成后，Security Filter 再次执行时鉴权失败

  问题分析过程

  第一次尝试：在 GlobalExceptionHandler 中捕获异常

  我一开始以为是异常处理的问题，就在全局异常处理器里加了捕获逻辑：

  @ExceptionHandler(AuthorizationDeniedException.class)
  public void handleAuthorizationDenied(...) {
      // 只是记录日志，不抛异常
  }

  结果：没用。因为日志显示 response is already committed，响应已经提交了，无法再处理异常。

  第二次尝试：在异步线程中传递 SecurityContext

  我意识到是线程问题。SSE 是异步的，主线程返回 SseEmitter 后就结束了，但 Reactor 在其他线程中处理流式响应。

  我在代码里加了这样的逻辑：

  // 保存 SecurityContext
  final SecurityContext securityContext = SecurityContextHolder.getContext();

  controlledFlux.subscribe(
      response -> {
          try {
              SecurityContextHolder.setContext(securityContext);
              // 业务逻辑...
          } finally {
              SecurityContextHolder.clearContext(); // ❌ 这是问题所在
          }
      }
  );

  结果：还是有问题。而且我发现，加了 finally 清理后反而更容易出问题。

  第三次尝试：不放行接口，在方法内鉴权

  之前为了快速开发，我在 SecurityConfig 中放行了这些接口：
  .requestMatchers("/biz/chat/**").permitAll()

  但导师说这样不安全，要求必须登录才能访问。我改成了在 Controller 层手动校验：

  @PostMapping("/stream")
  public ResponseEntity<?> chatStream(...) {
      try {
          Long userId = SecurityUtils.getUserId();
      } catch (Exception e) {
          return SseResponseUtil.createErrorResponse("请先登录");
      }
      // ...
  }

  结果：验证逻辑移到了异步执行前，但流式响应完成后的报错依然存在。

  根本原因分析


  SSE 请求的生命周期

  1. 请求到达 → Servlet 线程（http-nio-9080-exec-3）
     ↓
  2. Spring Security Filter 鉴权 → SecurityContext 设置
     ↓
  3. 进入 Controller → 返回 SseEmitter
     ↓
  4. Servlet 线程释放（但 SSE 连接保持）
     ↓
  5. Reactor 在 boundedElastic 线程中处理流式响应
     ↓
  6. 流式响应完成
     ↓
  7. Tomcat 回收 Servlet 线程 → Security Filter 再次执行 ❌
     ↓
  8. 此时 SecurityContext 已丢失 → AuthorizationDeniedException

  为什么会丢失？

  默认情况下，SecurityContextHolder 使用 MODE_THREADLOCAL 模式，SecurityContext 只在当前线程有效。当请求进入异步阶段（Reactor 的线程），主线程的 SecurityContext 无法传递到子线程。

  最终解决方案

  在查阅了 Spring Security 官方文档和相关资料后，找到了两个关键配置：

  方案一：设置 SecurityContext 传播策略

  在应用启动类中设置：

  @SpringBootApplication
  public class RuoYiApplication {
      public static void main(String[] args) {
          // 关键：设置 SecurityContext 传播策略
          SecurityContextHolder.setStrategyName(
              SecurityContextHolder.MODE_INHERITABLETHREADLOCAL
          );

          SpringApplication.run(RuoYiApplication.class, args);
      }
  }

  方案二：配置 Spring Security 支持异步

  @Bean
  protected SecurityFilterChain filterChain(HttpSecurity httpSecurity) throws Exception {
      return httpSecurity
          // ...其他配置...
          .securityContext(securityContext ->
              securityContext.requireExplicitSave(false)
          )
          .build();
  }

  效果

  设置 MODE_INHERITABLETHREADLOCAL 后：
  - ✅ 父线程的 SecurityContext 自动复制到子线程
  - ✅ Reactor 的异步线程可以正常获取用户信息
  - ✅ SSE 响应完成后 Security Filter 再次执行时，SecurityContext 仍然存在

  代码实现细节

  1. 应用启动类

  package com.ruoyi;

  import org.springframework.boot.SpringApplication;
  import org.springframework.boot.autoconfigure.SpringBootApplication;
  import org.springframework.security.core.context.SecurityContextHolder;

  @SpringBootApplication(
      exclude = { DataSourceAutoConfiguration.class },
      scanBasePackages = {"com.ruoyi", "com.questcomputeai"}
  )
  public class RuoYiApplication {
      public static void main(String[] args) {
          // 设置 SecurityContext 传播策略为 MODE_INHERITABLETHREADLOCAL
          // 这样子线程（如 Reactor 的异步线程）可以继承父线程的 SecurityContext
          // 解决 SSE 流式响应完成后 Spring Security Filter 再次执行时的鉴权问题
          SecurityContextHolder.setStrategyName(
              SecurityContextHolder.MODE_INHERITABLETHREADLOCAL
          );

          SpringApplication.run(RuoYiApplication.class, args);
      }
  }

  2. SecurityConfig 配置

  @EnableWebSecurity
  @Configuration
  public class SecurityConfig {

      @Bean
      protected SecurityFilterChain filterChain(HttpSecurity httpSecurity) throws Exception {
          return httpSecurity
              .csrf(csrf -> csrf.disable())
              // ...其他配置...
              .sessionManagement(session ->
                  session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
              )
              .authorizeHttpRequests((requests) -> {
                  // 不再放行接口，要求必须登录
                  requests.requestMatchers("/login", "/register").permitAll()
                      .anyRequest().authenticated();
              })
              .securityContext(securityContext ->
                  securityContext.requireExplicitSave(false)
              )
              .build();
      }
  }

  3. 异步回调中的处理

  // 保存 SecurityContext
  final SecurityContext securityContext = SecurityContextHolder.getContext();

  controlledFlux.subscribe(
      response -> {
          // 设置 SecurityContext（如果需要）
          SecurityContextHolder.setContext(securityContext);
          try {
              // 业务逻辑
          } catch (Exception e) {
              // 异常处理
          }
          // 注意：不要手动 clearContext()，让 Spring Security 管理
      }
  );

  学到的经验

  1. 理解 Spring Security 的异步支持

  Spring Security 默认使用 MODE_THREADLOCAL，这对于同步请求没问题，但对于异步请求（SSE、WebFlux、@Async）需要使用 MODE_INHERITABLETHREADLOCAL。

  2. 不要手动清理 SecurityContext

  在异步场景下，手动调用 SecurityContextHolder.clearContext() 可能会导致：
  - 线程池复用时，后续请求获取不到认证信息
  - Reactor 回调执行时 SecurityContext 已被清理

  正确做法：让 Spring Security 的 Filter 自动管理 SecurityContext 的生命周期。

  3. SSE 是异步请求

  SSE 虽然看起来像是一个 HTTP 请求，但实际上：
  - Servlet 线程会提前返回
  - 后续的流式响应在其他线程中执行
  - 请求完成后，Servlet 容器会执行一些清理工作（包括 Filter 链）

  4. 调试技巧

  - 观察线程名称：boundedElastic-* 是 Reactor 的线程，http-nio-* 是 Servlet 线程
  - 关注异常发生的时机：是请求进行中还是请求完成后
  - 阅读官方文档：Spring Security 有专门的异步支持章节

  总结

  这次问题排查花了我大概两天时间，一开始完全没头绪，只是看到报错就懵了。在导师的指导下，一步步分析日志，理解 SSE 的工作原理，最终找到了解决方案。

  作为一个实习生，这次经历让我学到了很多：

  1. 遇到问题不要慌：仔细看日志，找关键信息
  2. 理解原理很重要：不只是一味地复制粘贴代码
  3. 查阅官方文档：网上的很多教程可能已经过时了
  4. 异步编程要小心：线程切换、上下文传递都是坑

  希望我的经历能帮助到其他遇到类似问题的同学。如果有不对的地方，欢迎大佬们指正！

  ---
  参考资料

  - https://docs.spring.io/spring-security/reference/servlet/async/index.html
  - https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-async.html
  - https://docs.spring.io/spring-security/reference/servlet/architecture.html

  ---
  写这篇博客的时候，问题已经解决了。希望下次遇到类似问题，我能更快地定位到原因。继续加油！💪

  ---