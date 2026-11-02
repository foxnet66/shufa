# 诗文选：篇目与版本

当前去重后共 **970 篇**，在首批手录 24 篇基础上新增 946 篇，含唐诗、宋词、《诗经》及《论语》。文本随站点静态托管，无外部诗词服务请求。可同时按文集、体裁、作者/题名/诗句检索。

## 文集与来源

| 文集 | 可检索篇数 | 来源 |
| --- | --- | --- |
| 常用选篇 | 24 | 首批独立录入，下文列出版本与校阅入口 |
| 唐诗选 | 357 | [源文件](https://github.com/chinese-poetry/chinese-poetry/blob/b8594f81a89752241442f2ce267d6f66f96704ee/%E5%85%A8%E5%94%90%E8%AF%97/%E5%94%90%E8%AF%97%E4%B8%89%E7%99%BE%E9%A6%96.json) |
| 宋词选 | 280 | [源文件](https://github.com/chinese-poetry/chinese-poetry/blob/b8594f81a89752241442f2ce267d6f66f96704ee/%E5%AE%8B%E8%AF%8D/%E5%AE%8B%E8%AF%8D%E4%B8%89%E7%99%BE%E9%A6%96.json) |
| 诗经 | 305 | [源文件](https://github.com/chinese-poetry/chinese-poetry/blob/b8594f81a89752241442f2ce267d6f66f96704ee/%E8%AF%97%E7%BB%8F/shijing.json) |
| 论语 | 20 | [源文件](https://github.com/chinese-poetry/chinese-poetry/blob/b8594f81a89752241442f2ce267d6f66f96704ee/%E8%AE%BA%E8%AF%AD/lunyu.json) |

同一作品可同时属于「常用选篇」和其来源文集，合计仍是 970 个条目。源文件的《唐诗三百首》《宋词三百首》含分组及版本口径差异，原始记录分别为 366、280 条；因此界面称「唐诗选」「宋词选」，不宣称某一校勘定本的完整三百首。

## 数字整理与许可

新增数据来自 [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry)，固定提交 `b8594f81a89752241442f2ce267d6f66f96704ee`。原古典作品为公版，数字整理数据按其 MIT 许可再分发；保留 [完整原许可](../dist/data/chinese-poetry-LICENSE.txt)（Copyright 2016 JackeyGao）。首批独立录入仍优先使用原有通行文本，不包含现代译注、网页排版或原参考书法站的数据。

整理采用开发工具 opencc-js 1.4.2 的繁体到简体转换；另外统一「緜/绵、牀/床、羣/群、峯/峰、髙/高、畵/画、淸/清、卽/即、眞/真、兎/兔」十组明确异体字。其他古字可能保留；字体缺字会沿用界面的后备提示。

去重时识别同作者的相同正文；与首批选篇起句及字数一致的版本优先保留首批文本。保留的明显同名异文标为「源本异文」。属于同一词牌而正文不同的词不会合并。文集归属随保留的条目一起记录。输入文件 SHA-256、被合并的记录及字形转换表在 [导入清单](classics-import.json) 中。

本库用于书写排版，未逐篇人工校勘。字数和正文完整性检查不等同于版本校勘，异文可通过各篇来源复核。长题名最多 120 字，完整载入与绘制；超过 14 字时提示题款缩小，可自拟短题。正文超过 4000 字、缺损占位符或异常字段会使导入失败，绝不静默截断。

## 重建静态数据

网站运行和现有测试不依赖安装包；只有重建语料需要开发依赖：

```sh
npm ci
npm run corpus:build
```

脚本按 `scripts/classics-source-lock.json` 下载固定版本并核对 SHA-256，缓存于 Git 忽略的 `artifacts/corpus-source/`。输出 `dist/classics-corpus.js`、源许可与导入清单；转换库及词典不进入浏览器包。

## 版本说明

- 《静夜思》采用《唐诗三百首》常见的「床前明月光」「举头望明月」版本。
- 《水调歌头》录正文、不含小序，采用「又恐琼楼玉宇」「何事长向别时圆」。
- 《爱莲说》采用常见的「世人甚爱牡丹」写法；部分古籍作「盛爱」。
- 《鹿柴》保留「返景」写法。
- 《望庐山瀑布》录组诗中的完整七言绝句，非五言古诗。
- 《兰亭集序》明确标为节选，范围从「永和九年」至「感慨系之矣」。

## 首批手录篇目

| 体裁 | 篇名 | 作者 | 字数（不含标点） | 校阅参考 |
| --- | --- | --- | --- | --- |
| 五言 | 山居秋暝 | 唐 · 王维 | 40 | [维基文库](https://zh.wikisource.org/wiki/%E5%B1%B1%E5%B1%85%E7%A7%8B%E6%9A%9D) |
| 七言 | 赤壁 | 唐 · 杜牧 | 28 | [维基文库](https://zh.wikisource.org/wiki/%E8%B5%A4%E5%A3%81) |
| 古文 | 兰亭集序 · 节选 | 晋 · 王羲之 | 199 | [维基文库](https://zh.wikisource.org/wiki/%E8%98%AD%E4%BA%AD%E9%9B%86%E5%BA%8F) |
| 五言 | 静夜思 | 唐 · 李白 | 20 | [维基文库](https://zh.wikisource.org/wiki/%E9%9D%9C%E5%A4%9C%E6%80%9D) |
| 五言 | 春晓 | 唐 · 孟浩然 | 20 | [维基文库](https://zh.wikisource.org/wiki/%E6%98%A5%E6%9B%89) |
| 五言 | 登鹳雀楼 | 唐 · 王之涣 | 20 | [维基文库](https://zh.wikisource.org/wiki/%E7%99%BB%E9%B8%9B%E9%9B%80%E6%A8%93) |
| 五言 | 鹿柴 | 唐 · 王维 | 20 | [维基文库](https://zh.wikisource.org/wiki/%E9%B9%BF%E6%9F%B4) |
| 五言 | 相思 | 唐 · 王维 | 20 | [维基文库](https://zh.wikisource.org/wiki/%E7%9B%B8%E6%80%9D) |
| 五言 | 竹里馆 | 唐 · 王维 | 20 | [维基文库](https://zh.wikisource.org/wiki/%E7%AB%B9%E9%87%8C%E9%A4%A8) |
| 五言 | 鸟鸣涧 | 唐 · 王维 | 20 | [维基文库](https://zh.wikisource.org/wiki/%E9%B3%A5%E9%B3%B4%E6%BE%97) |
| 五言 | 江雪 | 唐 · 柳宗元 | 20 | [维基文库](https://zh.wikisource.org/wiki/%E6%B1%9F%E9%9B%AA) |
| 五言 | 春望 | 唐 · 杜甫 | 40 | [维基文库](https://zh.wikisource.org/wiki/%E6%98%A5%E6%9C%9B) |
| 七言 | 早发白帝城 | 唐 · 李白 | 28 | [维基文库](https://zh.wikisource.org/wiki/%E6%97%A9%E7%99%BC%E7%99%BD%E5%B8%9D%E5%9F%8E) |
| 七言 | 望庐山瀑布 | 唐 · 李白 | 28 | [维基文库](https://zh.wikisource.org/wiki/%E6%9C%9B%E5%BB%AC%E5%B1%B1%E7%80%91%E5%B8%83) |
| 七言 | 黄鹤楼送孟浩然之广陵 | 唐 · 李白 | 28 | [维基文库](https://zh.wikisource.org/wiki/%E9%BB%83%E9%B6%B4%E6%A8%93%E9%80%81%E5%AD%9F%E6%B5%A9%E7%84%B6%E4%B9%8B%E5%BB%A3%E9%99%B5) |
| 七言 | 九月九日忆山东兄弟 | 唐 · 王维 | 28 | [维基文库](https://zh.wikisource.org/wiki/%E4%B9%9D%E6%9C%88%E4%B9%9D%E6%97%A5%E6%86%B6%E5%B1%B1%E6%9D%B1%E5%85%84%E5%BC%9F) |
| 七言 | 题西林壁 | 宋 · 苏轼 | 28 | [维基文库](https://zh.wikisource.org/wiki/%E9%A1%8C%E8%A5%BF%E6%9E%97%E5%A3%81) |
| 七言 | 游山西村 | 宋 · 陆游 | 56 | [维基文库](https://zh.wikisource.org/wiki/%E9%81%8A%E5%B1%B1%E8%A5%BF%E6%9D%91) |
| 七言 | 枫桥夜泊 | 唐 · 张继 | 28 | [维基文库](https://zh.wikisource.org/wiki/%E6%A5%93%E6%A9%8B%E5%A4%9C%E6%B3%8A) |
| 词 | 如梦令 · 常记溪亭 | 宋 · 李清照 | 33 | [维基文库](https://zh.wikisource.org/wiki/%E5%A6%82%E5%A4%A2%E4%BB%A4_(%E6%9D%8E%E6%B8%85%E7%85%A7)%2F%E5%A6%82%E5%A4%A2%E4%BB%A4_(%E5%B8%B8%E8%A8%98%E6%BA%AA%E4%BA%AD%E6%97%A5%E6%9A%AE)) |
| 词 | 浣溪沙 · 一曲新词 | 宋 · 晏殊 | 42 | [维基文库](https://zh.wikisource.org/wiki/%E6%B5%A3%E6%BA%AA%E6%B2%99_(%E6%99%8F%E6%AE%8A)) |
| 词 | 水调歌头 · 明月几时有 | 宋 · 苏轼 | 95 | [维基文库](https://zh.wikisource.org/wiki/%E6%B0%B4%E8%AA%BF%E6%AD%8C%E9%A0%AD_(%E6%98%8E%E6%9C%88%E5%B9%BE%E6%99%82%E6%9C%89)) |
| 古文 | 陋室铭 | 唐 · 刘禹锡 | 81 | [维基文库](https://zh.wikisource.org/wiki/%E9%99%8B%E5%AE%A4%E9%8A%98) |
| 古文 | 爱莲说 | 宋 · 周敦颐 | 119 | [维基文库](https://zh.wikisource.org/wiki/%E6%84%9B%E8%93%AE%E8%AA%AA) |

整理日期：2026-11-02。作者姓名、篇名与节选说明随文本保留。
