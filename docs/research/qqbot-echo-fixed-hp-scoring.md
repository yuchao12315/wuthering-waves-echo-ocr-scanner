# QQ 机器人 C1 固定生命评分逻辑核查

## 结论

WutheringWavesUID 可访问镜像中的卡提希娅评分模板，确实将 C1 固定生命 `2280` 按 C1 生命百分比主属性 `22.8%` 的一半价值计算。

源码没有写通用的 `0.5` 运算，也没有使用 `20000` 基础生命常量。等效的 `0.5` 由卡提希娅模板中的两个权重直接编码：固定生命权重为 `0.0015`，生命百分比权重为 `0.3`。

```text
固定生命原始分 = 2280 * 0.0015 = 3.42
生命百分比原始分 = 22.8 * 0.3 = 6.84
3.42 / 6.84 = 0.5
```

## 源码证据

1. 卡提希娅的 `calc.json` 在 C1 `main_props` 中配置：`生命: 0.0015`、`生命%: 0.3`，并配置 `score_max[0] = 78.986`。
   - [卡提希娅 calc.json](https://github.com/raared/WWUID/blob/master/WutheringWavesUID/utils/map/character/%E5%8D%A1%E6%8F%90%E5%B8%8C%E5%A8%85/calc.json)

2. `calc_phantom_entry()` 将声骸前两条属性视为主属性。无百分号的生命直接执行 `main_props["生命"] * value`，百分比生命执行 `main_props["生命%"] * value`，之后除以对应 `score_max` 并向下截断到两位小数。
   - [utils/calculate.py](https://github.com/raared/WWUID/blob/master/WutheringWavesUID/utils/calculate.py#L42-L91)

3. 评分生成脚本明确配置 C1 固定生命为 `2280`、C1 生命百分比为 `22.8%`；`calc_main_max_score()` 使用模板权重与这两个固定值直接相乘生成主属性最大分。
   - [utils/map/calc_score_script.py](https://github.com/raared/WWUID/blob/master/WutheringWavesUID/utils/map/calc_score_script.py#L175-L188)
   - [calc_main_max_score()](https://github.com/raared/WWUID/blob/master/WutheringWavesUID/utils/map/calc_score_script.py#L238-L257)

## 图片回放

```text
固定生命单项 = floor((2280 * 0.0015 / 78.986 * 50) * 100) / 100
             = 2.16

生命%单项    = floor((22.8 * 0.3 / 78.986 * 50) * 100) / 100
             = 4.32
```

这与机器人图片中的 `2.16` 和 `4.32` 完全一致。

## 对当前项目的影响

当前项目卡提希娅 C1 固定生命权重为 `0.002`，与该机器人源码的 `0.0015` 不一致。若目标是复现机器人评分，应同步模板权重，而不是在评分引擎中增加通用 `0.5` 或 `20000` 换算逻辑。其他角色是否采用同样比例，需要逐个检查各自 `calc.json`，不能把卡提希娅规则全局化。

## 来源范围

- 核查镜像：[raared/WWUID](https://github.com/raared/WWUID)
- 镜像 README 标识项目为 WutheringWavesUID 2.0，版本文件为 `3.2.8`。
- 原仓库当前无法直接访问，因此上述结论针对该可访问源码镜像；数学结果与用户提供的机器人截图完全一致。
