+++
date = '2025-12-13T19:32:03+08:00'
draft = false
title = 'Git命令'

tags = ['Git']
categories = ['Git']
image = "images/postCover/git.png"

+++
# Git
## 1、git pull  git fetch的区别
git pull 会自动 merge  fetch需要自己手动合并
## 2、写代码时，写到一半忘记切分支怎么办？
1. 如何想要切换的分支与当前分支没有冲突，可直接 checkout 会自动将工作区的更改带过去
2. 如果有冲突
```bash
# 1. 先把修改暂存起来
git stash

# 2. 切到正确分支
git checkout brach-target

# 3. 把修改拿回来
git stash pop
```

## 3、cherry pick 是什么？
可以将 某个分支的几个提交，合并到另外一个分支上
## 4、"后悔药"
### 未提交时，想放弃更改
1. git reset --hard HEAD
丢弃 工作区 + 暂存区 的所有修改
2. git checkout -- .
不影响暂存区
3. 已经 add 但是没 commit
```bash
#先取消暂存
git reset HEAD .
#丢弃修改 
git reset HEAD .
```
### 已经提交，如何撤回提交
1. git reset --soft HEAD~1
撤回 最近一次 commit  代码还在暂存区
2. git reset HEAD~1
代码在 工作区
3. git reset --hard HEAD~1
撤回 commit，代码也不要了

### 已经push，想撤回push
git revert commit-id

git push
