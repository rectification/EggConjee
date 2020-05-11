---
title: CRODIC 算法简析
date: 2020/05/25
tag: 数值求解, 算法
description: 对于初等函数机算而言，泰勒展开虽然精确但是却太慢，打表搜索虽然快但又要占据大量内存空间。CRODIC 即坐标旋转数字计算，这种算法兼顾了内存空间和计算速度的双重优势，同时在精度上也并未缩水太多。
---

CRODIC 算法，即*坐标旋转数字计算(Coordinate Rotation Digital Computer)*，因为其简单的结构，只有移位累加的计算过程，不需要硬件乘法器，没有除法运算，而且它可以计算几乎所有的初等函数，纯硬件的实现非常简单，所以该算法被广泛的应用于 FPGA 平台。这个算法适用于没有硬件乘法器，没有浮点运算单元，Flash 空间也很捉急的小型系统，或者是对于实时性要求很高的软件、游戏也有着很大的优势。

## 算法原理
CORDIC 算法的核心其实就是对广义向量旋转进行迭代，由 J.D.Volder 于1959年首次提出，当时主要用来机算三角函数。在1971年，Walter.J 提出了*统一 CORDIC 算法*，将线性和双曲线变换都囊括进了此算法之中，形成目前所用到的 CORDIC 算法最基本的数学基础。

### 坐标旋转
![坐标旋转](./images/coordinate-rotation.png)

坐标旋转，顾名思义就是将上图中的 *(x~1~, y~1~)* 旋转 *θ* 度之后到 *(x~2~, y~2~)* 的过程。求解过程很简单，这里就略过。解得：

$$
\left\{\begin{matrix}
x_2=x_1\cdot cos\theta +y_1\cdot sin\theta\\
y_2=x_1\cdot sin\theta -y_1\cdot cos\theta
\end{matrix}\right.
$$

$\sqrt{3x-1}+(1+x)^2$

为了方便分析，提出$cos\theta$这个公因式，得到：

$$
\left\{\begin{matrix}
x_2=cos\theta(x_1+y_1\cdot tan\theta)\\
y_2=cos\theta(y_1-x_1\cdot tan\theta)
\end{matrix}\right.
$$
