#!/usr/bin/env python3
"""
Fill chainEffects for all 53 characters in characters-base.json.
Based on chains data from XutheringWavesUID and manual analysis of each S1-S6 description.

ChainEffect types:
  BuffType: atkPct, critRate, critDmg, elemDmg, normalAtkDmg, heavyAtkDmg, resonanceSkillDmg, resonanceLiberationDmg, hpPct, defPct
  Extended: defIgnore, resReduce, dmgDeepen, guaranteedCrit, multiplierBoost
"""
import json

# fmt: off
CHAIN_EFFECTS = {
    # ===== 散华 1102 =====
    "散华": [
        {"sequence": 1, "type": "critRate", "value": 0.15, "condition": "第5段普攻后暴击+15%"},
        {"sequence": 3, "type": "dmgDeepen", "value": 0.35, "condition": "攻击<70%HP目标伤害+35%"},
        {"sequence": 4, "type": "multiplierBoost", "value": 1.20, "condition": "共鸣解放后重击爆裂倍率+120%", "targetSkill": "重击"},
        {"sequence": 5, "type": "critDmg", "value": 1.00, "condition": "冰绽暴击伤害+100%", "targetSkill": "冰绽"},
        {"sequence": 6, "type": "atkPct", "value": 0.20, "condition": "引爆冰棱/冰川后全队攻击+10%×2层"},
    ],
    # ===== 白芷 1103 =====
    "白芷": [
        {"sequence": 2, "type": "elemDmg", "value": 0.15, "condition": "4念意施放应急预案后冷凝伤害加成+15%"},
        {"sequence": 6, "type": "elemDmg", "value": 0.12, "condition": "拾取天籁后全队冷凝伤害加成+12%"},
    ],
    # ===== 凌阳 1104 =====
    "凌阳": [
        {"sequence": 3, "type": "normalAtkDmg", "value": 0.20, "condition": "狮子奋迅期间普攻伤害加成+20%"},
        {"sequence": 3, "type": "resonanceSkillDmg", "value": 0.10, "condition": "狮子奋迅期间共鸣技能伤害加成+10%"},
        {"sequence": 4, "type": "elemDmg", "value": 0.20, "condition": "延奏技能后全队冷凝伤害加成+20%"},
        {"sequence": 6, "type": "normalAtkDmg", "value": 1.00, "condition": "行狮状态共鸣技能后普攻伤害加成+100%", "targetSkill": "普攻"},
    ],
    # ===== 折枝 1105 =====
    "折枝": [
        {"sequence": 1, "type": "critRate", "value": 0.10, "condition": "施放极意·神来之笔后暴击+10%"},
        {"sequence": 3, "type": "atkPct", "value": 0.45, "condition": "施放共鸣技能后攻击+15%×3层"},
        {"sequence": 4, "type": "atkPct", "value": 0.20, "condition": "共鸣解放后全队攻击+20%"},
    ],
    # ===== 釉瑚 1106 =====
    "釉瑚": [
        {"sequence": 3, "type": "atkPct", "value": 0.20, "condition": "攻击提升20%"},
        {"sequence": 5, "type": "critRate", "value": 0.15, "condition": "变奏技能后暴击+15%"},
        {"sequence": 6, "type": "critDmg", "value": 0.60, "condition": "施放奇珍赏后暴击伤害+15%×4层"},
    ],
    # ===== 珂莱塔 1107 =====
    "珂莱塔": [
        {"sequence": 1, "type": "critRate", "value": 0.125, "condition": "对解离目标暴击+12.5%"},
        {"sequence": 2, "type": "multiplierBoost", "value": 1.26, "condition": "共鸣解放致死以终倍率+126%", "targetSkill": "致死以终"},
        {"sequence": 3, "type": "multiplierBoost", "value": 0.93, "condition": "暴力美学/示我璀璨倍率+93%", "targetSkill": "暴力美学|示我璀璨"},
        {"sequence": 4, "type": "resonanceSkillDmg", "value": 0.25, "condition": "施放重击后全队共鸣技能伤害加成+25%"},
        {"sequence": 5, "type": "multiplierBoost", "value": 0.47, "condition": "重击末路见行倍率+47%", "targetSkill": "末路见行"},
        {"sequence": 6, "type": "multiplierBoost", "value": 1.866, "condition": "共鸣解放死兆倍率+186.6%", "targetSkill": "死兆"},
    ],
    # ===== 绯雪 1108 =====
    "绯雪": [
        {"sequence": 1, "type": "multiplierBoost", "value": 1.20, "condition": "预求身系列倍率+120%", "targetSkill": "预求身"},
        {"sequence": 2, "type": "multiplierBoost", "value": 1.25, "condition": "普攻·居合倍率+125%", "targetSkill": "居合"},
        {"sequence": 3, "type": "multiplierBoost", "value": 1.60, "condition": "寒簇·常世身/枯霜·预求身倍率+160%", "targetSkill": "寒簇|枯霜"},
        {"sequence": 4, "type": "dmgDeepen", "value": 0.20, "condition": "施放共鸣技能后全队伤害+20%"},
        {"sequence": 5, "type": "multiplierBoost", "value": 0.80, "condition": "共鸣技能·常世身/白玉切/落华倍率+80%", "targetSkill": "常世身|白玉切|落华"},
        {"sequence": 6, "type": "critDmg", "value": 5.00, "condition": "预求我身·见心/归刃暴击伤害+500%", "targetSkill": "见心|归刃"},
    ],
    # ===== 洛瑟菈 1109 =====
    "洛瑟菈": [
        {"sequence": 1, "type": "critRate", "value": 0.20, "condition": "施放追光后暴击+20%"},
        {"sequence": 3, "type": "multiplierBoost", "value": 1.00, "condition": "断舍离倍率+100%", "targetSkill": "断舍离"},
        {"sequence": 4, "type": "atkPct", "value": 0.30, "condition": "施放遗忘后攻击+10%×3层"},
        {"sequence": 5, "type": "multiplierBoost", "value": 0.50, "condition": "遗忘倍率+50%", "targetSkill": "遗忘"},
    ],
    # ===== 炽霞 1202 — 已有数据，保留 =====
    "炽霞": [
        {"sequence": 1, "type": "guaranteedCrit", "value": 1, "condition": "施放共鸣技能轰轰时必定暴击", "targetSkill": "轰轰"},
        {"sequence": 3, "type": "dmgDeepen", "value": 0.40, "condition": "炽烈焰火对<50%HP目标伤害+40%", "targetSkill": "炽烈焰火"},
        {"sequence": 5, "type": "atkPct", "value": 0.30, "condition": "加麻加辣满层时攻击额外+30%"},
        {"sequence": 6, "type": "normalAtkDmg", "value": 0.25, "condition": "轰轰后全队普攻伤害+25%"},
    ],
    # ===== 安可 1203 =====
    "安可": [
        {"sequence": 1, "type": "elemDmg", "value": 0.12, "condition": "普攻命中后热熔伤害加成+3%×4层"},
        {"sequence": 3, "type": "multiplierBoost", "value": 0.40, "condition": "白咩·失控之炎/黑咩·暴走之炎倍率+40%", "targetSkill": "失控之炎|暴走之炎"},
        {"sequence": 4, "type": "elemDmg", "value": 0.20, "condition": "施放黑咩·暴走之炎后全队热熔伤害加成+20%"},
        {"sequence": 5, "type": "resonanceSkillDmg", "value": 0.35, "condition": "共鸣技能伤害加成+35%"},
        {"sequence": 6, "type": "atkPct", "value": 0.25, "condition": "黑咩大暴走期间攻击+5%×5层"},
    ],
    # ===== 莫特斐 1204 =====
    "莫特斐": [
        {"sequence": 3, "type": "critDmg", "value": 0.30, "condition": "浮翼狂想期间加强音暴击伤害+30%"},
        {"sequence": 6, "type": "atkPct", "value": 0.20, "condition": "施放暴烈终曲后全队攻击+20%"},
    ],
    # ===== 长离 1205 =====
    "长离": [
        {"sequence": 1, "type": "dmgDeepen", "value": 0.10, "condition": "施放赫羽三相/焚身以火造成伤害+10%"},
        {"sequence": 2, "type": "critRate", "value": 0.25, "condition": "获得离火后暴击+25%"},
        {"sequence": 3, "type": "multiplierBoost", "value": 0.80, "condition": "共鸣解放离火照丹心倍率+80%", "targetSkill": "离火照丹心"},
        {"sequence": 4, "type": "atkPct", "value": 0.20, "condition": "变奏技能后全队攻击+20%"},
        {"sequence": 5, "type": "multiplierBoost", "value": 0.50, "condition": "重击焚身以火倍率+50%", "targetSkill": "焚身以火"},
        {"sequence": 5, "type": "dmgDeepen", "value": 0.50, "condition": "重击焚身以火伤害+50%", "targetSkill": "焚身以火"},
        {"sequence": 6, "type": "defIgnore", "value": 0.40, "condition": "赫羽三相/焚身以火/离火照丹心忽视40%防御", "targetSkill": "赫羽三相|焚身以火|离火照丹心"},
    ],
    # ===== 布兰特 1206 =====
    "布兰特": [
        {"sequence": 1, "type": "dmgDeepen", "value": 0.60, "condition": "变奏技能后/空翻时伤害+20%×3层"},
        {"sequence": 2, "type": "critRate", "value": 0.30, "condition": "空中攻击和火焰归亡曲暴击+30%", "targetSkill": "空中攻击|火焰归亡曲"},
        {"sequence": 3, "type": "multiplierBoost", "value": 0.42, "condition": "火焰归亡曲倍率+42%", "targetSkill": "火焰归亡曲"},
        {"sequence": 5, "type": "normalAtkDmg", "value": 0.15, "condition": "造成普攻伤害后普攻伤害加成+15%"},
        {"sequence": 6, "type": "multiplierBoost", "value": 0.30, "condition": "空中攻击倍率+30%", "targetSkill": "空中攻击"},
    ],
    # ===== 露帕 1207 =====
    "露帕": [
        {"sequence": 1, "type": "critRate", "value": 0.20, "condition": "施放共鸣解放后暴击+20%"},
        {"sequence": 2, "type": "elemDmg", "value": 0.40, "condition": "施放共鸣解放/重击等后全队热熔伤害加成+20%×2层"},
        {"sequence": 3, "type": "resReduce", "value": 0.15, "condition": "队伍角色攻击时无视15%热熔抗性"},
        {"sequence": 4, "type": "multiplierBoost", "value": 1.25, "condition": "狼舞的决意·极倍率+125%", "targetSkill": "狼舞的决意"},
        {"sequence": 5, "type": "resonanceLiberationDmg", "value": 0.15, "condition": "施放变奏技能后共鸣解放伤害加成+15%"},
        {"sequence": 6, "type": "defIgnore", "value": 0.30, "condition": "狼舞的决意·极/荣光/变奏忽视30%防御", "targetSkill": "狼舞的决意|荣光|你无法逃离"},
    ],
    # ===== 嘉贝莉娜 1208 =====
    "嘉贝莉娜": [
        {"sequence": 1, "type": "critDmg", "value": 0.80, "condition": "恶翼扬升满余火时暴击伤害+2%×40=80%"},
        {"sequence": 3, "type": "multiplierBoost", "value": 1.30, "condition": "共鸣解放倍率+130%", "targetSkill": "共鸣解放"},
        {"sequence": 4, "type": "elemDmg", "value": 0.20, "condition": "队友施放声骸技能后全队全属性伤害加成+20%"},
        {"sequence": 5, "type": "multiplierBoost", "value": 1.50, "condition": "共鸣技能·迫近/恶翼扬升/掠袭倍率+150%", "targetSkill": "迫近|恶翼扬升|掠袭"},
        {"sequence": 6, "type": "multiplierBoost", "value": 0.60, "condition": "永恒位格期间普攻/重击/空中攻击/闪避反击倍率+60%"},
    ],
    # ===== 莫宁 1209 =====
    "莫宁": [
        {"sequence": 5, "type": "multiplierBoost", "value": 0.40, "condition": "共鸣解放·临界协议倍率+40%", "targetSkill": "临界协议"},
        {"sequence": 5, "type": "multiplierBoost", "value": 1.60, "condition": "震谐响应·粒子射流倍率+160%", "targetSkill": "粒子射流"},
        {"sequence": 6, "type": "dmgDeepen", "value": 4.00, "condition": "共鸣解放·临界协议伤害+400%", "targetSkill": "临界协议"},
    ],
    # ===== 爱弥斯 1210 =====
    "爱弥斯": [
        {"sequence": 1, "type": "critDmg", "value": 3.00, "condition": "即刻响应状态重击暴击伤害+300%", "targetSkill": "重击"},
        {"sequence": 2, "type": "multiplierBoost", "value": 1.00, "condition": "光翼共奏·降临/登台倍率+100%", "targetSkill": "光翼共奏"},
        {"sequence": 3, "type": "multiplierBoost", "value": 1.00, "condition": "共鸣解放·终结倍率+100%", "targetSkill": "终结"},
        {"sequence": 3, "type": "multiplierBoost", "value": 0.40, "condition": "共鸣解放·过载倍率+40%", "targetSkill": "过载"},
        {"sequence": 4, "type": "elemDmg", "value": 0.20, "condition": "变奏/共鸣技能后全队全属性伤害加成+20%"},
        {"sequence": 6, "type": "dmgDeepen", "value": 0.40, "condition": "目标受到共鸣解放伤害+40%"},
    ],
    # ===== 达妮娅 1211 =====
    "达妮娅": [
        {"sequence": 1, "type": "critDmg", "value": 0.30, "condition": "暴击伤害+30%"},
        {"sequence": 3, "type": "multiplierBoost", "value": 0.80, "condition": "帷幕终景·幻灭之形倍率+80%", "targetSkill": "帷幕终景"},
        {"sequence": 5, "type": "dmgDeepen", "value": 1.00, "condition": "帷幕终景·布景之形伤害+100%", "targetSkill": "帷幕终景.*布景"},
        {"sequence": 6, "type": "atkPct", "value": 0.60, "condition": "熵变强化时攻击+60%"},
        {"sequence": 6, "type": "elemDmg", "value": 0.60, "condition": "熵变强化时热熔伤害加成+60%"},
    ],
    # ===== 卡卡罗 1301 =====
    "卡卡罗": [
        {"sequence": 2, "type": "resonanceSkillDmg", "value": 0.30, "condition": "变奏技能后共鸣技能伤害加成+30%"},
        {"sequence": 3, "type": "elemDmg", "value": 0.25, "condition": "杀戮武装期间导电伤害加成+25%"},
        {"sequence": 4, "type": "elemDmg", "value": 0.20, "condition": "延奏技能后全队导电伤害加成+20%"},
        {"sequence": 5, "type": "dmgDeepen", "value": 0.50, "condition": "变奏技能伤害+50%", "targetSkill": "全境通缉|必要的手段"},
    ],
    # ===== 吟霖 1302 =====
    "吟霖": [
        {"sequence": 1, "type": "dmgDeepen", "value": 0.70, "condition": "磁殛咆哮和召雷磁爆伤害+70%", "targetSkill": "磁殛咆哮|召雷磁爆"},
        {"sequence": 3, "type": "multiplierBoost", "value": 0.55, "condition": "审判之雷倍率+55%", "targetSkill": "审判之雷"},
        {"sequence": 4, "type": "atkPct", "value": 0.20, "condition": "审判之雷命中后全队攻击+20%"},
        {"sequence": 5, "type": "dmgDeepen", "value": 1.00, "condition": "共鸣解放命中带标记目标伤害+100%", "targetSkill": "破天雷灭击"},
    ],
    # ===== 渊武 1303 =====
    "渊武": [
        {"sequence": 5, "type": "resonanceLiberationDmg", "value": 0.50, "condition": "雷之楔在场时共鸣解放伤害加成+50%"},
        {"sequence": 6, "type": "defPct", "value": 0.32, "condition": "雷之楔范围内全队防御+32%"},
    ],
    # ===== 今汐 1304 =====
    "今汐": [
        {"sequence": 1, "type": "dmgDeepen", "value": 0.80, "condition": "惊龙破空消耗惊蛰4层伤害+20%×4", "targetSkill": "惊龙破空"},
        {"sequence": 3, "type": "atkPct", "value": 0.50, "condition": "变奏技能后攻击+25%×2层"},
        {"sequence": 4, "type": "elemDmg", "value": 0.20, "condition": "施放共鸣解放/惊龙破空后全队全属性伤害加成+20%"},
        {"sequence": 5, "type": "multiplierBoost", "value": 1.20, "condition": "共鸣解放移岁诛邪倍率+120%", "targetSkill": "移岁诛邪"},
        {"sequence": 6, "type": "multiplierBoost", "value": 0.45, "condition": "惊龙破空倍率+45%", "targetSkill": "惊龙破空"},
    ],
    # ===== 相里要 1305 =====
    "相里要": [
        {"sequence": 2, "type": "critDmg", "value": 0.30, "condition": "施放共鸣技能/解放后暴击伤害+30%"},
        {"sequence": 3, "type": "dmgDeepen", "value": 0.63, "condition": "共鸣解放后共鸣技能伤害+63%×5次", "targetSkill": "应刃|基本推衍|一相万殊|万方法则"},
        {"sequence": 4, "type": "resonanceLiberationDmg", "value": 0.25, "condition": "共鸣解放后全队共鸣解放伤害加成+25%"},
        {"sequence": 5, "type": "multiplierBoost", "value": 1.00, "condition": "共鸣解放思维矩阵倍率+100%", "targetSkill": "思维矩阵"},
        {"sequence": 6, "type": "multiplierBoost", "value": 0.76, "condition": "强化万方法则倍率+76%", "targetSkill": "万方法则"},
    ],
    # ===== 奥古斯塔 1306 =====
    "奥古斯塔": [
        {"sequence": 1, "type": "critDmg", "value": 0.30, "condition": "以众愿为冕每层暴击伤害+15%×2层"},
        {"sequence": 2, "type": "critRate", "value": 0.40, "condition": "以众愿为冕每层暴击+20%×2层"},
        {"sequence": 3, "type": "multiplierBoost", "value": 0.25, "condition": "重击/共鸣技能/共鸣解放相关倍率+25%"},
        {"sequence": 4, "type": "atkPct", "value": 0.20, "condition": "变奏技能后全队攻击+20%"},
    ],
    # ===== 卜灵 1307 =====
    "卜灵": [
        {"sequence": 1, "type": "critRate", "value": 0.20, "condition": "飞雷诀·归一暴击+20%", "targetSkill": "飞雷诀"},
        {"sequence": 6, "type": "resonanceSkillDmg", "value": 0.50, "condition": "雷法·三才合一期间全队共鸣技能伤害加成+50%"},
    ],
    # ===== 丽贝卡 1308 =====
    "丽贝卡": [
        {"sequence": 1, "type": "multiplierBoost", "value": 0.50, "condition": "猎手/铁胆技能倍率+50%"},
        {"sequence": 2, "type": "elemDmg", "value": 0.20, "condition": "变奏/共鸣解放后全队全属性伤害加成+20%"},
        {"sequence": 2, "type": "dmgDeepen", "value": 0.15, "condition": "队伍角色附加骇破·偏移时全伤害加深+15%"},
        {"sequence": 3, "type": "multiplierBoost", "value": 0.60, "condition": "共鸣解放狂欢时间!/大烟花!倍率+60%", "targetSkill": "狂欢时间|大烟花"},
        {"sequence": 5, "type": "normalAtkDmg", "value": 0.20, "condition": "附加骇破·偏移后普攻伤害加成+20%"},
        {"sequence": 6, "type": "normalAtkDmg", "value": 0.40, "condition": "所有来源普攻伤害加成数值+40%"},
    ],
    # ===== 秧秧 1402 =====
    "秧秧": [
        {"sequence": 1, "type": "elemDmg", "value": 0.15, "condition": "变奏技能后气动伤害加成+15%"},
        {"sequence": 3, "type": "resonanceSkillDmg", "value": 0.40, "condition": "共鸣技能伤害加成+40%"},
        {"sequence": 5, "type": "dmgDeepen", "value": 0.85, "condition": "共鸣解放朔风旋涌伤害+85%", "targetSkill": "朔风旋涌"},
        {"sequence": 6, "type": "atkPct", "value": 0.20, "condition": "空中攻击释羽后全队攻击+20%"},
    ],
    # ===== 秋水 1403 =====
    "秋水": [
        {"sequence": 2, "type": "atkPct", "value": 0.15, "condition": "攻击被分身嘲讽目标时攻击+15%"},
        {"sequence": 4, "type": "dmgDeepen", "value": 0.30, "condition": "共鸣技能雾化子弹伤害+30%", "targetSkill": "雾化子弹"},
        {"sequence": 5, "type": "elemDmg", "value": 0.25, "condition": "迷雾潜行期间气动伤害加成+25%"},
        {"sequence": 6, "type": "critRate", "value": 0.08, "condition": "共鸣解放使暴击+8%"},
    ],
    # ===== 忌炎 1404 =====
    "忌炎": [
        {"sequence": 2, "type": "atkPct", "value": 0.28, "condition": "变奏技能后攻击+28%"},
        {"sequence": 3, "type": "critRate", "value": 0.16, "condition": "施放枪扫风定/苍躣八荒/攻其不备后暴击+16%"},
        {"sequence": 3, "type": "critDmg", "value": 0.32, "condition": "施放枪扫风定/苍躣八荒/攻其不备后暴击伤害+32%"},
        {"sequence": 4, "type": "heavyAtkDmg", "value": 0.25, "condition": "共鸣解放后全队重击伤害加成+25%"},
        {"sequence": 5, "type": "atkPct", "value": 0.45, "condition": "攻击命中后攻击+3%×15层"},
        {"sequence": 6, "type": "multiplierBoost", "value": 2.40, "condition": "苍躣八荒·后动消耗锐意之势每层倍率+120%×2", "targetSkill": "苍躣八荒"},
    ],
    # ===== 鉴心 1405 =====
    "鉴心": [
        {"sequence": 4, "type": "resonanceLiberationDmg", "value": 0.80, "condition": "共鸣回路重击·混元气旋后共鸣解放涤净力场伤害+80%"},
    ],
    # ===== 夏空 1407 =====
    "夏空": [
        {"sequence": 1, "type": "atkPct", "value": 0.35, "condition": "施放普攻后攻击+35%"},
        {"sequence": 2, "type": "elemDmg", "value": 0.40, "condition": "共鸣解放期间全队气动伤害加成+40%"},
        {"sequence": 4, "type": "defIgnore", "value": 0.45, "condition": "重击四拍重奏/共鸣解放无视45%防御"},
        {"sequence": 5, "type": "resonanceLiberationDmg", "value": 0.40, "condition": "共鸣解放伤害加成+40%"},
    ],
    # ===== 漂泊者·气动 1408 =====
    "漂泊者·气动": [
        {"sequence": 3, "type": "elemDmg", "value": 0.15, "condition": "气动伤害加成+15%"},
        {"sequence": 4, "type": "resonanceSkillDmg", "value": 0.15, "condition": "空中攻击后共鸣技能伤害加成+15%"},
        {"sequence": 5, "type": "multiplierBoost", "value": 0.20, "condition": "共鸣解放万象归墟倍率+20%", "targetSkill": "万象归墟"},
        {"sequence": 6, "type": "multiplierBoost", "value": 0.30, "condition": "共鸣技能缥缈无相倍率+30%", "targetSkill": "缥缈无相"},
    ],
    # ===== 卡提希娅 1409 =====
    "卡提希娅": [
        {"sequence": 2, "type": "multiplierBoost", "value": 0.50, "condition": "卡提希娅普攻/重击/闪避反击/变奏倍率+50%"},
        {"sequence": 2, "type": "multiplierBoost", "value": 2.00, "condition": "卡提希娅空中攻击倍率+200%", "targetSkill": "空中攻击"},
        {"sequence": 3, "type": "multiplierBoost", "value": 1.00, "condition": "共鸣解放·看潮怒风哮之刃倍率+100%", "targetSkill": "看潮怒风哮之刃"},
        {"sequence": 4, "type": "elemDmg", "value": 0.20, "condition": "附加异常效应后全队全属性伤害加成+20%"},
    ],
    # ===== 尤诺 1410 =====
    "尤诺": [
        {"sequence": 1, "type": "atkPct", "value": 0.40, "condition": "月相流转状态时攻击+40%"},
        {"sequence": 2, "type": "dmgDeepen", "value": 0.40, "condition": "苍白死光祝颂满10层时全伤害加深+40%"},
        {"sequence": 3, "type": "dmgDeepen", "value": 0.65, "condition": "月相流转状态月弓·普攻/弦引/闪避反击伤害加深+65%", "targetSkill": "月弓|弦引|闪避反击"},
        {"sequence": 5, "type": "resonanceLiberationDmg", "value": 0.20, "condition": "共鸣解放伤害加成+20%"},
        {"sequence": 6, "type": "multiplierBoost", "value": 16.00, "condition": "重击·至臻的完满倍率+1600%", "targetSkill": "至臻的完满"},
    ],
    # ===== 仇远 1411 =====
    "仇远": [
        {"sequence": 1, "type": "critRate", "value": 0.20, "condition": "暴击+20%"},
        {"sequence": 2, "type": "dmgDeepen", "value": 0.30, "condition": "竹照获得后全队声骸技能伤害加深+30%"},
        {"sequence": 3, "type": "multiplierBoost", "value": 5.00, "condition": "共鸣解放万钧一断倍率+500%", "targetSkill": "万钧一断"},
        {"sequence": 4, "type": "atkPct", "value": 0.20, "condition": "攻击+20%"},
        {"sequence": 5, "type": "defIgnore", "value": 0.15, "condition": "无视目标15%防御"},
    ],
    # ===== 西格莉卡 1412 =====
    "西格莉卡": [
        {"sequence": 1, "type": "multiplierBoost", "value": 0.70, "condition": "明悟/解读/大嘭嘭!/日灵帮帮忙倍率+70%", "targetSkill": "明悟|解读|大嘭嘭|日灵帮帮忙"},
        {"sequence": 2, "type": "multiplierBoost", "value": 1.20, "condition": "共鸣回路·我即语义倍率+120%", "targetSkill": "我即语义"},
        {"sequence": 4, "type": "atkPct", "value": 0.20, "condition": "队友施放声骸技能后全队攻击+20%"},
        {"sequence": 5, "type": "multiplierBoost", "value": 0.30, "condition": "共鸣解放如那期望般!倍率+30%", "targetSkill": "如那期望般"},
        {"sequence": 6, "type": "dmgDeepen", "value": 0.30, "condition": "目标受到西格莉卡的伤害+30%"},
        {"sequence": 6, "type": "dmgDeepen", "value": 0.60, "condition": "天赋?满层伤害加深+15%×4层", "targetSkill": "符语|我即语义"},
        {"sequence": 6, "type": "defIgnore", "value": 0.30, "condition": "天赋?满层忽视目标7.5%×4防御", "targetSkill": "符语|我即语义"},
    ],
    # ===== 漂泊者·衍射 1502 =====
    "漂泊者·衍射": [
        {"sequence": 1, "type": "critRate", "value": 0.15, "condition": "施放共鸣技能后暴击+15%"},
        {"sequence": 2, "type": "elemDmg", "value": 0.20, "condition": "衍射伤害加成+20%"},
        {"sequence": 5, "type": "resonanceLiberationDmg", "value": 0.40, "condition": "共鸣解放伤害加成+40%"},
        {"sequence": 6, "type": "resReduce", "value": 0.10, "condition": "共鸣技能命中后目标衍射抗性-10%"},
    ],
    # ===== 维里奈 1503 =====
    "维里奈": [
        {"sequence": 4, "type": "elemDmg", "value": 0.15, "condition": "重击/空中/共鸣解放/延奏技能后全队衍射伤害加成+15%"},
        {"sequence": 6, "type": "dmgDeepen", "value": 0.20, "condition": "重击/空中攻击星星花绽放伤害+20%", "targetSkill": "星星花绽放"},
    ],
    # ===== 灯灯 1504 =====
    "灯灯": [
        {"sequence": 2, "type": "defIgnore", "value": 0.20, "condition": "强化·前扑/后撤无视20%防御", "targetSkill": "强化"},
        {"sequence": 3, "type": "dmgDeepen", "value": 0.30, "condition": "共鸣解放啾啾专送伤害+30%", "targetSkill": "啾啾专送"},
        {"sequence": 4, "type": "normalAtkDmg", "value": 0.30, "condition": "普攻伤害加成+30%"},
        {"sequence": 5, "type": "multiplierBoost", "value": 1.00, "condition": "光能满时强光穿射倍率+100%", "targetSkill": "强光穿射"},
        {"sequence": 6, "type": "atkPct", "value": 0.20, "condition": "共鸣解放后全队攻击+20%"},
    ],
    # ===== 守岸人 1505 =====
    "守岸人": [
        {"sequence": 2, "type": "atkPct", "value": 0.40, "condition": "浅析星域中全队攻击+40%"},
        {"sequence": 6, "type": "multiplierBoost", "value": 0.42, "condition": "变奏技能洞悉倍率+42%", "targetSkill": "洞悉"},
        {"sequence": 6, "type": "critDmg", "value": 5.00, "condition": "变奏技能洞悉暴击伤害+500%", "targetSkill": "洞悉"},
    ],
    # ===== 菲比 1506 =====
    "菲比": [
        {"sequence": 1, "type": "multiplierBoost", "value": 4.80, "condition": "赦罪状态共鸣解放启明之誓愿倍率提升效果从255%→480%", "targetSkill": "启明之誓愿"},
        {"sequence": 4, "type": "resReduce", "value": 0.10, "condition": "普攻命中后目标衍射抗性-10%"},
        {"sequence": 5, "type": "elemDmg", "value": 0.12, "condition": "变奏技能后衍射伤害加成+12%"},
    ],
    # ===== 赞妮 1507 =====
    "赞妮": [
        {"sequence": 1, "type": "elemDmg", "value": 0.50, "condition": "施放集中压制/破袭反击后衍射伤害加成+50%"},
        {"sequence": 2, "type": "critRate", "value": 0.20, "condition": "暴击+20%"},
        {"sequence": 2, "type": "multiplierBoost", "value": 0.80, "condition": "集中压制/破袭反击倍率+80%", "targetSkill": "集中压制|破袭反击"},
        {"sequence": 4, "type": "atkPct", "value": 0.20, "condition": "变奏技能后全队攻击+20%"},
        {"sequence": 5, "type": "multiplierBoost", "value": 1.20, "condition": "共鸣解放重燃倍率+120%", "targetSkill": "重燃"},
        {"sequence": 6, "type": "multiplierBoost", "value": 0.40, "condition": "重斩系列倍率+40%", "targetSkill": "重斩"},
    ],
    # ===== 千咲 1508 =====
    "千咲": [
        {"sequence": 1, "type": "atkPct", "value": 0.30, "condition": "附加虚无绞痕后攻击+30%"},
        {"sequence": 2, "type": "resReduce", "value": 0.10, "condition": "造成伤害无视目标10%湮灭抗性"},
        {"sequence": 2, "type": "elemDmg", "value": 0.50, "condition": "虚湮之线期间全队全属性伤害加成+50%"},
        {"sequence": 3, "type": "multiplierBoost", "value": 1.20, "condition": "锯环·疾攻/闪避反击/终结倍率+120%", "targetSkill": "锯环|电锯模式"},
        {"sequence": 5, "type": "resonanceLiberationDmg", "value": 1.00, "condition": "共鸣解放即刻·归无伤害加成+100%", "targetSkill": "即刻·归无"},
        {"sequence": 6, "type": "dmgDeepen", "value": 0.40, "condition": "虚无绞痕·终焉目标受到千咲伤害+40%"},
    ],
    # ===== 琳奈 1509 =====
    "琳奈": [
        {"sequence": 1, "type": "multiplierBoost", "value": 1.20, "condition": "普攻·幻光折跃倍率+120%", "targetSkill": "幻光折跃"},
        {"sequence": 2, "type": "dmgDeepen", "value": 0.25, "condition": "全伤害加深+25%"},
        {"sequence": 3, "type": "multiplierBoost", "value": 0.90, "condition": "视觉冲击/虹彩飞溅倍率+90%", "targetSkill": "视觉冲击|虹彩飞溅"},
        {"sequence": 4, "type": "atkPct", "value": 0.20, "condition": "攻击+20%"},
        {"sequence": 5, "type": "multiplierBoost", "value": 0.70, "condition": "共鸣解放·爆炸喷涂倍率+70%", "targetSkill": "爆炸喷涂"},
        {"sequence": 6, "type": "dmgDeepen", "value": 0.90, "condition": "心之彩满3层虹彩飞溅/视觉冲击伤害+30%×3", "targetSkill": "虹彩飞溅|视觉冲击"},
    ],
    # ===== 陆·赫斯 1510 =====
    "陆·赫斯": [
        {"sequence": 1, "type": "normalAtkDmg", "value": 1.50, "condition": "空中攻击伤害加成+150%"},
        {"sequence": 2, "type": "multiplierBoost", "value": 0.60, "condition": "共鸣解放于永冻中释义倍率+60%", "targetSkill": "于永冻中释义"},
        {"sequence": 3, "type": "multiplierBoost", "value": 1.36, "condition": "黄金裁量下斩杀日冕倍率+136%", "targetSkill": "斩杀日冕|判决大地|日髓阵列"},
        {"sequence": 4, "type": "dmgDeepen", "value": 0.20, "condition": "谐度破坏后全队伤害+20%"},
        {"sequence": 5, "type": "resonanceLiberationDmg", "value": 0.80, "condition": "变奏/延奏技能伤害加成+80%"},
        {"sequence": 6, "type": "dmgDeepen", "value": 0.30, "condition": "谐度破坏后目标受斩杀日冕/日髓/判决伤害+30%", "targetSkill": "斩杀日冕|日髓阵列|判决大地"},
    ],
    # ===== 露西 1511 =====
    "露西": [
        {"sequence": 1, "type": "atkPct", "value": 0.20, "condition": "变奏技能后攻击+20%"},
        {"sequence": 2, "type": "elemDmg", "value": 0.20, "condition": "变奏/共鸣解放后全队全属性伤害加成+20%"},
        {"sequence": 2, "type": "dmgDeepen", "value": 0.15, "condition": "附加骇破·偏移后全伤害加深+15%"},
        {"sequence": 3, "type": "multiplierBoost", "value": 0.50, "condition": "覆写篡改倍率+50%", "targetSkill": "覆写篡改"},
        {"sequence": 3, "type": "critDmg", "value": 1.00, "condition": "覆写篡改暴击伤害+100%", "targetSkill": "覆写篡改"},
        {"sequence": 4, "type": "elemDmg", "value": 0.20, "condition": "附加骇破·偏移后全队全属性伤害加成+20%"},
        {"sequence": 6, "type": "dmgDeepen", "value": 0.40, "condition": "骇破·偏移/干涉目标受到重击伤害+40%"},
    ],
    # ===== 桃祈 1601 =====
    "桃祈": [
        {"sequence": 2, "type": "critRate", "value": 0.20, "condition": "共鸣解放不动如山暴击+20%", "targetSkill": "不动如山"},
        {"sequence": 2, "type": "critDmg", "value": 0.20, "condition": "共鸣解放不动如山暴击伤害+20%", "targetSkill": "不动如山"},
        {"sequence": 5, "type": "dmgDeepen", "value": 0.50, "condition": "共鸣回路攻防转换伤害+50%", "targetSkill": "攻防转换"},
        {"sequence": 6, "type": "dmgDeepen", "value": 0.40, "condition": "磐岩护壁护盾期间普攻/重击伤害+40%"},
    ],
    # ===== 丹瑾 1602 =====
    "丹瑾": [
        {"sequence": 1, "type": "atkPct", "value": 0.30, "condition": "攻击带朱蚀之刻目标时攻击+5%×6层"},
        {"sequence": 2, "type": "dmgDeepen", "value": 0.20, "condition": "攻击带朱蚀之刻目标伤害+20%"},
        {"sequence": 3, "type": "resonanceLiberationDmg", "value": 0.30, "condition": "共鸣解放伤害加成+30%"},
        {"sequence": 4, "type": "critRate", "value": 0.15, "condition": "彤华≥60时暴击+15%"},
        {"sequence": 5, "type": "elemDmg", "value": 0.30, "condition": "湮灭伤害加成+15%+HP<60%额外+15%"},
        {"sequence": 6, "type": "atkPct", "value": 0.20, "condition": "施放重击缭乱后全队攻击+20%"},
    ],
    # ===== 椿 1603 =====
    "椿": [
        {"sequence": 1, "type": "critDmg", "value": 0.28, "condition": "变奏技能后暴击伤害+28%"},
        {"sequence": 2, "type": "multiplierBoost", "value": 1.20, "condition": "共鸣回路一日花倍率+120%", "targetSkill": "一日花"},
        {"sequence": 3, "type": "multiplierBoost", "value": 0.50, "condition": "共鸣解放芳华绽烬倍率+50%", "targetSkill": "芳华绽烬"},
        {"sequence": 3, "type": "atkPct", "value": 0.58, "condition": "含苞状态攻击+58%"},
        {"sequence": 4, "type": "normalAtkDmg", "value": 0.25, "condition": "变奏技能后全队普攻伤害加成+25%"},
        {"sequence": 5, "type": "multiplierBoost", "value": 3.03, "condition": "变奏技能八千春秋倍率+303%", "targetSkill": "八千春秋"},
    ],
    # ===== 漂泊者·湮灭 1605 =====
    "漂泊者·湮灭": [
        {"sequence": 1, "type": "resonanceSkillDmg", "value": 0.30, "condition": "共鸣技能伤害加成+30%"},
        {"sequence": 4, "type": "resReduce", "value": 0.10, "condition": "重击灭音/共鸣解放命中后目标湮灭抗性-10%"},
        {"sequence": 6, "type": "critRate", "value": 0.25, "condition": "暗涌状态暴击+25%"},
    ],
    # ===== 洛可可 1606 =====
    "洛可可": [
        {"sequence": 2, "type": "elemDmg", "value": 0.40, "condition": "幻想照进现实后全队湮灭伤害加成+10%×3层+满层额外+10%"},
        {"sequence": 3, "type": "critRate", "value": 0.10, "condition": "变奏技能后暴击+10%"},
        {"sequence": 3, "type": "critDmg", "value": 0.30, "condition": "变奏技能后暴击伤害+30%"},
        {"sequence": 4, "type": "multiplierBoost", "value": 0.60, "condition": "共鸣技能后普攻幻想照进现实倍率+60%", "targetSkill": "幻想照进现实"},
        {"sequence": 5, "type": "multiplierBoost", "value": 0.20, "condition": "共鸣解放即兴喜剧倍率+20%", "targetSkill": "即兴喜剧"},
        {"sequence": 5, "type": "multiplierBoost", "value": 0.80, "condition": "共鸣解放重击倍率+80%"},
        {"sequence": 6, "type": "defIgnore", "value": 0.60, "condition": "共鸣解放后幻想照进现实无视60%防御", "targetSkill": "幻想照进现实"},
    ],
    # ===== 坎特蕾拉 1607 =====
    "坎特蕾拉": [
        {"sequence": 1, "type": "multiplierBoost", "value": 0.50, "condition": "共鸣技能翩跹/斑驳幻梦/感知汲取倍率+50%", "targetSkill": "翩跹|斑驳幻梦|感知汲取"},
        {"sequence": 2, "type": "multiplierBoost", "value": 2.45, "condition": "惊醒倍率+245%", "targetSkill": "惊醒"},
        {"sequence": 3, "type": "multiplierBoost", "value": 3.70, "condition": "共鸣解放陷溺倍率+370%", "targetSkill": "陷溺"},
        {"sequence": 6, "type": "multiplierBoost", "value": 0.80, "condition": "普攻蛰幻倍率+80%", "targetSkill": "蛰幻"},
        {"sequence": 6, "type": "defIgnore", "value": 0.30, "condition": "施放共鸣解放后无视30%防御"},
    ],
    # ===== 弗洛洛 1608 =====
    "弗洛洛": [
        {"sequence": 1, "type": "multiplierBoost", "value": 0.80, "condition": "亡与死的乐章/永不消逝的梦呓倍率+80%", "targetSkill": "亡与死的乐章|永不消逝的梦呓"},
        {"sequence": 2, "type": "multiplierBoost", "value": 0.75, "condition": "谱曲终末倍率+75%", "targetSkill": "谱曲终末"},
        {"sequence": 3, "type": "dmgDeepen", "value": 0.80, "condition": "声骸技能伤害加深+80%"},
        {"sequence": 4, "type": "elemDmg", "value": 0.20, "condition": "施放声骸技能后全队全属性伤害加成+20%"},
        {"sequence": 6, "type": "multiplierBoost", "value": 0.24, "condition": "强化攻击·赫卡忒倍率+24%", "targetSkill": "赫卡忒"},
        {"sequence": 6, "type": "dmgDeepen", "value": 0.40, "condition": "指挥状态非登场时目标受伤害+40%"},
        {"sequence": 6, "type": "elemDmg", "value": 0.60, "condition": "指挥状态登场时湮灭伤害加成+60%"},
    ],
}
# fmt: on

def main():
    with open('src/data/characters-base.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    missing = []
    for name in data.keys():
        if name in CHAIN_EFFECTS:
            data[name]['chainEffects'] = CHAIN_EFFECTS[name]
            updated += 1
        else:
            missing.append(name)
            data[name]['chainEffects'] = []

    with open('src/data/characters-base.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Updated {updated} characters with chainEffects")
    if missing:
        print(f"No chainEffects data for: {missing}")
    
    # Stats
    total_effects = sum(len(v) for v in CHAIN_EFFECTS.values())
    print(f"Total chainEffect entries: {total_effects}")

if __name__ == '__main__':
    main()
