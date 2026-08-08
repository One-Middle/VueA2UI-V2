<!--
自动生成文件，请勿手动修改。
权威源：packages/agent/src/skills/*.ts
生成命令：pnpm --filter @a2ui-platform/agent skill:docs
-->

---
skill: "A2UI v0.9 组件消息生成"
id: "high-quality-a2ui-good-cases"
title: "高质量 A2UI Good Case"
description: "复杂 UI 或需要质量标杆时请求；包含来自 renderer-capability-demo 的 Music Player、Finance Brief、Work Board 三个完整 good case，并说明为什么好。"
---

# 高质量 A2UI Good Case

本 Reference 收录完整、可审查的高质量 A2UI 标杆。Good Case 不是供照抄的小片段；它们用于建立质量判断：如何组织 dataModel、组件树、视觉层次、状态派生和事件回传。

## Good Case 1: Music Player

```json
[
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "main",
      "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
    }
  },
  {
    "version": "v0.9",
    "updateDataModel": {
      "surfaceId": "main",
      "path": "/",
      "value": {
        "player": {
          "isPlaying": false,
          "progress": 32,
          "isFavorite": false
        },
        "song": {
          "title": "Midnight Drive",
          "artist": "Synthwave Dreams",
          "coverUrl": "data:image/svg+xml,%0A%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20640%20640%22%3E%0A%20%20%3Cdefs%3E%0A%20%20%20%20%3ClinearGradient%20id%3D%22albumBg%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%220%22%20stop-color%3D%22%230f172a%22%2F%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%220.48%22%20stop-color%3D%22%230ea5e9%22%2F%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23f97316%22%2F%3E%0A%20%20%20%20%3C%2FlinearGradient%3E%0A%20%20%20%20%3Cfilter%20id%3D%22soft%22%20x%3D%22-20%25%22%20y%3D%22-20%25%22%20width%3D%22140%25%22%20height%3D%22140%25%22%3E%0A%20%20%20%20%20%20%3CfeGaussianBlur%20stdDeviation%3D%2218%22%2F%3E%0A%20%20%20%20%3C%2Ffilter%3E%0A%20%20%3C%2Fdefs%3E%0A%20%20%3Crect%20width%3D%22640%22%20height%3D%22640%22%20rx%3D%2248%22%20fill%3D%22url(%23albumBg)%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%22214%22%20cy%3D%22206%22%20r%3D%2292%22%20fill%3D%22%23f8fafc%22%20opacity%3D%220.24%22%20filter%3D%22url(%23soft)%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%22430%22%20cy%3D%22394%22%20r%3D%22148%22%20fill%3D%22%23111827%22%20opacity%3D%220.45%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%22430%22%20cy%3D%22394%22%20r%3D%2242%22%20fill%3D%22%23f8fafc%22%20opacity%3D%220.92%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M188%20424c92-132%20172-188%20264-168%22%20fill%3D%22none%22%20stroke%3D%22%23f8fafc%22%20stroke-width%3D%2222%22%20stroke-linecap%3D%22round%22%20opacity%3D%220.88%22%2F%3E%0A%20%20%3Ctext%20x%3D%2270%22%20y%3D%22558%22%20fill%3D%22%23f8fafc%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2242%22%20font-weight%3D%22700%22%3ENorthline%3C%2Ftext%3E%0A%3C%2Fsvg%3E"
        }
      }
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "main",
      "components": [
        {
          "id": "root",
          "component": "Container",
          "child": "musicCard",
          "width": "content",
          "padding": "none"
        },
        {
          "id": "musicCard",
          "component": "Card",
          "child": "musicBody",
          "role": "media",
          "density": "compact",
          "preset": "media",
          "variant": "elevated",
          "style": {
            "backgroundColor": "#0F2A2E",
            "color": "#ffffff"
          }
        },
        {
          "id": "musicBody",
          "component": "Column",
          "children": [
            "cover",
            "musicInfoRow",
            "musicProgress",
            "musicControls"
          ],
          "gap": "14px"
        },
        {
          "id": "cover",
          "component": "Image",
          "url": {
            "path": "/song/coverUrl"
          },
          "alt": "Album cover",
          "role": "cover",
          "shape": "rounded",
          "fit": "cover",
          "aspectRatio": "1:1",
          "caption": "Live renderer state"
        },
        {
          "id": "musicInfoRow",
          "component": "Row",
          "children": [
            "songText",
            "favButton"
          ],
          "role": "mediaObject",
          "alignment": "center",
          "distribution": "spaceBetween",
          "wrap": false
        },
        {
          "id": "songText",
          "component": "Column",
          "children": [
            "songLabel",
            "songTitle",
            "songArtist"
          ],
          "gap": "3px"
        },
        {
          "id": "songLabel",
          "component": "Text",
          "text": "NOW PLAYING",
          "usageHint": "caption",
          "emphasis": "success"
        },
        {
          "id": "songTitle",
          "component": "Text",
          "text": {
            "path": "/song/title"
          },
          "usageHint": "h3",
          "truncate": true,
          "style": {
            "color": "#ffffff"
          }
        },
        {
          "id": "songArtist",
          "component": "Text",
          "text": {
            "path": "/song/artist"
          },
          "usageHint": "caption",
          "emphasis": "muted"
        },
        {
          "id": "favIcon",
          "component": "Icon",
          "name": {
            "script": {
              "code": "return dataModel.get('/player/isFavorite') ? 'favorite' : 'favorite_border';",
              "deps": [
                "/player/isFavorite"
              ],
              "fallback": "favorite_border"
            }
          },
          "semantic": "action",
          "label": "收藏",
          "status": "danger",
          "tone": "danger"
        },
        {
          "id": "favButton",
          "component": "Button",
          "child": "favIcon",
          "importance": "quiet",
          "shape": "circle",
          "action": {
            "script": {
              "code": "const next = !Boolean(dataModel.get('/player/isFavorite')); dataModel.set('/player/isFavorite', next); actions.emit('favoriteChanged', { isFavorite: next });",
              "deps": [
                "/player/isFavorite"
              ]
            }
          }
        },
        {
          "id": "musicProgress",
          "component": "Slider",
          "min": 0,
          "max": 100,
          "step": 1,
          "value": {
            "path": "/player/progress"
          },
          "valueDisplay": "none"
        },
        {
          "id": "musicControls",
          "component": "Row",
          "children": [
            "prevButton",
            "playButton",
            "nextButton"
          ],
          "role": "actions",
          "alignment": "center",
          "distribution": "spaceEvenly",
          "wrap": false
        },
        {
          "id": "prevButton",
          "component": "Button",
          "icon": "skip_previous",
          "iconPosition": "only",
          "importance": "quiet",
          "shape": "circle",
          "action": {
            "event": {
              "name": "previousTrack",
              "context": {
                "title": {
                  "path": "/song/title"
                }
              }
            }
          }
        },
        {
          "id": "playIcon",
          "component": "Icon",
          "name": {
            "script": {
              "code": "return dataModel.get('/player/isPlaying') ? 'pause' : 'play_arrow';",
              "deps": [
                "/player/isPlaying"
              ],
              "fallback": "play_arrow"
            }
          },
          "semantic": "action",
          "label": "播放切换",
          "size": "lg"
        },
        {
          "id": "playButton",
          "component": "Button",
          "child": "playIcon",
          "intent": "primary",
          "shape": "circle",
          "importance": "prominent",
          "size": "lg",
          "action": {
            "script": {
              "code": "const next = !Boolean(dataModel.get('/player/isPlaying')); dataModel.set('/player/isPlaying', next); actions.emit('playToggled', { isPlaying: next });",
              "deps": [
                "/player/isPlaying"
              ]
            }
          }
        },
        {
          "id": "nextButton",
          "component": "Button",
          "icon": "skip_next",
          "iconPosition": "only",
          "importance": "quiet",
          "shape": "circle",
          "action": {
            "event": {
              "name": "nextTrack",
              "context": {
                "title": {
                  "path": "/song/title"
                }
              }
            }
          }
        }
      ]
    }
  }
]
```

为什么好：它把播放进度、播放状态和收藏状态放入 dataModel；封面、标题、作者、进度和控制区分层明确；Icon.name 和按钮 label 通过受限脚本从状态派生；收藏和播放按钮会写回本地状态并 actions.emit；上一首/下一首使用 action.event 只提交业务事件。

## Good Case 2: Finance Brief

```json
[
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "main",
      "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
    }
  },
  {
    "version": "v0.9",
    "updateDataModel": {
      "surfaceId": "main",
      "path": "/",
      "value": {
        "finance": {
          "selectedCategory": "精选",
          "subscribed": false,
          "headline": "Market Pulse",
          "summary": "美股期货小幅走高，黄金维持高位震荡，机构继续关注本周通胀数据。",
          "indices": [
            {
              "id": "idx-1",
              "name": "NASDAQ",
              "value": "18,418.26",
              "change": "+0.82%",
              "tone": "success"
            },
            {
              "id": "idx-2",
              "name": "S&P 500",
              "value": "5,487.03",
              "change": "+0.31%",
              "tone": "success"
            },
            {
              "id": "idx-3",
              "name": "Gold",
              "value": "$2,384.6",
              "change": "-0.14%",
              "tone": "danger"
            }
          ],
          "news": [
            {
              "id": "news-1",
              "category": "精选",
              "title": "大型科技股盘前走强，AI 资本开支预期继续升温",
              "source": "Bloom Desk",
              "time": "08:45",
              "saved": true,
              "savedLabel": "已藏",
              "impact": "影响 高",
              "meta": "Bloom Desk · 08:45"
            },
            {
              "id": "news-2",
              "category": "美股",
              "title": "芯片板块延续反弹，分析师上调云端需求预测",
              "source": "Wallline",
              "time": "09:10",
              "saved": false,
              "savedLabel": "收藏",
              "impact": "影响 中",
              "meta": "Wallline · 09:10"
            },
            {
              "id": "news-3",
              "category": "加密",
              "title": "BTC 现货 ETF 资金连续三日净流入",
              "source": "Chain Note",
              "time": "09:28",
              "saved": false,
              "savedLabel": "收藏",
              "impact": "影响 中",
              "meta": "Chain Note · 09:28"
            },
            {
              "id": "news-4",
              "category": "宏观",
              "title": "美元指数回落，交易员等待 CPI 修正信号",
              "source": "Macro Lens",
              "time": "10:05",
              "saved": false,
              "savedLabel": "收藏",
              "impact": "影响 高",
              "meta": "Macro Lens · 10:05"
            }
          ],
          "visibleNews": [
            {
              "id": "news-1",
              "category": "精选",
              "title": "大型科技股盘前走强，AI 资本开支预期继续升温",
              "source": "Bloom Desk",
              "time": "08:45",
              "saved": true,
              "savedLabel": "已藏",
              "impact": "影响 高",
              "meta": "Bloom Desk · 08:45"
            },
            {
              "id": "news-2",
              "category": "美股",
              "title": "芯片板块延续反弹，分析师上调云端需求预测",
              "source": "Wallline",
              "time": "09:10",
              "saved": false,
              "savedLabel": "收藏",
              "impact": "影响 中",
              "meta": "Wallline · 09:10"
            },
            {
              "id": "news-3",
              "category": "加密",
              "title": "BTC 现货 ETF 资金连续三日净流入",
              "source": "Chain Note",
              "time": "09:28",
              "saved": false,
              "savedLabel": "收藏",
              "impact": "影响 中",
              "meta": "Chain Note · 09:28"
            },
            {
              "id": "news-4",
              "category": "宏观",
              "title": "美元指数回落，交易员等待 CPI 修正信号",
              "source": "Macro Lens",
              "time": "10:05",
              "saved": false,
              "savedLabel": "收藏",
              "impact": "影响 高",
              "meta": "Macro Lens · 10:05"
            }
          ]
        }
      }
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "main",
      "components": [
        {
          "id": "root",
          "component": "Container",
          "child": "financeShell",
          "width": "content",
          "padding": "none"
        },
        {
          "id": "financeShell",
          "component": "Card",
          "child": "financeBody",
          "role": "summary",
          "density": "compact",
          "variant": "plain",
          "style": {
            "padding": "0",
            "borderRadius": "24px",
            "borderColor": "#2f2415",
            "backgroundColor": "#080807",
            "color": "#f8edcf",
            "shadow": "lg"
          }
        },
        {
          "id": "financeBody",
          "component": "Column",
          "children": [
            "financeHero",
            "financeIndexGrid",
            "financeCategoryRow",
            "financeNewsList",
            "financeFooter"
          ],
          "gap": "14px",
          "style": {
            "padding": "18px"
          }
        },
        {
          "id": "financeHero",
          "component": "Column",
          "children": [
            "financeTopLine",
            "financeTitle",
            "financeSummary"
          ],
          "gap": "8px",
          "style": {
            "padding": "16px",
            "borderRadius": "18px",
            "backgroundColor": "#14100a",
            "borderColor": "#3c2d18",
            "borderWidth": "1px"
          }
        },
        {
          "id": "financeTopLine",
          "component": "Row",
          "children": [
            "financeMarketLabel",
            "financeSelectedCategory",
            "financeSubscribeButton"
          ],
          "role": "actions",
          "alignment": "center",
          "distribution": "spaceBetween",
          "gap": "8px",
          "wrap": false
        },
        {
          "id": "financeMarketLabel",
          "component": "Text",
          "text": "GLOBAL MARKETS",
          "usageHint": "caption",
          "style": {
            "color": "#d7b46a",
            "fontWeight": 900
          }
        },
        {
          "id": "financeSelectedCategory",
          "component": "Text",
          "text": {
            "script": {
              "code": "return `频道 · ${dataModel.get('/finance/selectedCategory') || '精选'}`;",
              "deps": [
                "/finance/selectedCategory"
              ],
              "fallback": "频道 · 精选"
            }
          },
          "role": "status",
          "usageHint": "caption",
          "style": {
            "color": "#f3d58b",
            "padding": "3px 8px",
            "borderRadius": "999px",
            "backgroundColor": "#241a0c"
          }
        },
        {
          "id": "financeSubscribeButton",
          "component": "Button",
          "label": {
            "script": {
              "code": "return dataModel.get('/finance/subscribed') ? '已订阅' : '订阅';",
              "deps": [
                "/finance/subscribed"
              ],
              "fallback": "订阅"
            }
          },
          "importance": "quiet",
          "shape": "pill",
          "size": "sm",
          "style": {
            "color": "#f5d58a",
            "borderColor": "#614719",
            "backgroundColor": "#1d160c"
          },
          "action": {
            "script": {
              "code": "const next = !Boolean(dataModel.get('/finance/subscribed')); dataModel.set('/finance/subscribed', next); actions.emit('financeSubscriptionChanged', { subscribed: next });",
              "deps": [
                "/finance/subscribed"
              ]
            }
          }
        },
        {
          "id": "financeTitle",
          "component": "Text",
          "text": {
            "path": "/finance/headline"
          },
          "usageHint": "h2",
          "style": {
            "color": "#fff7df",
            "fontWeight": 900
          }
        },
        {
          "id": "financeSummary",
          "component": "Text",
          "text": {
            "path": "/finance/summary"
          },
          "usageHint": "body",
          "style": {
            "color": "#c8b98e",
            "lineHeight": 1.7
          }
        },
        {
          "id": "financeIndexGrid",
          "component": "Grid",
          "columns": 3,
          "gap": "8px",
          "children": [
            "financeNasdaq",
            "financeSp",
            "financeGold"
          ]
        },
        {
          "id": "financeNasdaq",
          "component": "Card",
          "child": "financeNasdaqBody",
          "role": "metric",
          "density": "compact",
          "variant": "filled",
          "style": {
            "backgroundColor": "#120f0a",
            "borderColor": "#3a2b16",
            "borderRadius": "16px"
          }
        },
        {
          "id": "financeNasdaqBody",
          "component": "Column",
          "children": [
            "financeNasdaqName",
            "financeNasdaqValue",
            "financeNasdaqChange"
          ],
          "gap": "5px"
        },
        {
          "id": "financeNasdaqName",
          "component": "Text",
          "text": "NASDAQ",
          "usageHint": "caption",
          "style": {
            "color": "#b79a56",
            "fontWeight": 800
          }
        },
        {
          "id": "financeNasdaqValue",
          "component": "Text",
          "text": "18,418",
          "usageHint": "h4",
          "style": {
            "color": "#fff1c9",
            "fontWeight": 900
          }
        },
        {
          "id": "financeNasdaqChange",
          "component": "Text",
          "text": "+0.82%",
          "role": "status",
          "emphasis": "success",
          "usageHint": "caption"
        },
        {
          "id": "financeSp",
          "component": "Card",
          "child": "financeSpBody",
          "role": "metric",
          "density": "compact",
          "variant": "filled",
          "style": {
            "backgroundColor": "#120f0a",
            "borderColor": "#3a2b16",
            "borderRadius": "16px"
          }
        },
        {
          "id": "financeSpBody",
          "component": "Column",
          "children": [
            "financeSpName",
            "financeSpValue",
            "financeSpChange"
          ],
          "gap": "5px"
        },
        {
          "id": "financeSpName",
          "component": "Text",
          "text": "S&P 500",
          "usageHint": "caption",
          "style": {
            "color": "#b79a56",
            "fontWeight": 800
          }
        },
        {
          "id": "financeSpValue",
          "component": "Text",
          "text": "5,487",
          "usageHint": "h4",
          "style": {
            "color": "#fff1c9",
            "fontWeight": 900
          }
        },
        {
          "id": "financeSpChange",
          "component": "Text",
          "text": "+0.31%",
          "role": "status",
          "emphasis": "success",
          "usageHint": "caption"
        },
        {
          "id": "financeGold",
          "component": "Card",
          "child": "financeGoldBody",
          "role": "metric",
          "density": "compact",
          "variant": "filled",
          "style": {
            "backgroundColor": "#120f0a",
            "borderColor": "#3a2b16",
            "borderRadius": "16px"
          }
        },
        {
          "id": "financeGoldBody",
          "component": "Column",
          "children": [
            "financeGoldName",
            "financeGoldValue",
            "financeGoldChange"
          ],
          "gap": "5px"
        },
        {
          "id": "financeGoldName",
          "component": "Text",
          "text": "Gold",
          "usageHint": "caption",
          "style": {
            "color": "#b79a56",
            "fontWeight": 800
          }
        },
        {
          "id": "financeGoldValue",
          "component": "Text",
          "text": "$2,384",
          "usageHint": "h4",
          "style": {
            "color": "#fff1c9",
            "fontWeight": 900
          }
        },
        {
          "id": "financeGoldChange",
          "component": "Text",
          "text": "-0.14%",
          "role": "status",
          "emphasis": "danger",
          "usageHint": "caption"
        },
        {
          "id": "financeCategoryRow",
          "component": "Row",
          "children": [
            "financeAllButton",
            "financeStockButton",
            "financeCryptoButton",
            "financeMacroButton"
          ],
          "role": "actions",
          "gap": "8px",
          "wrap": true
        },
        {
          "id": "financeAllButton",
          "component": "Button",
          "label": "精选",
          "shape": "pill",
          "size": "sm",
          "intent": "warning",
          "action": {
            "script": {
              "code": "const news = dataModel.get('/finance/news') || []; dataModel.set('/finance/selectedCategory', '精选'); dataModel.set('/finance/visibleNews', news); actions.emit('financeCategoryChanged', { category: '精选', count: news.length });",
              "deps": [
                "/finance/news"
              ]
            }
          }
        },
        {
          "id": "financeStockButton",
          "component": "Button",
          "label": "美股",
          "shape": "pill",
          "size": "sm",
          "importance": "quiet",
          "style": {
            "color": "#d7b46a",
            "backgroundColor": "#16120a",
            "borderColor": "#3c2d18"
          },
          "action": {
            "script": {
              "code": "const news = dataModel.get('/finance/news') || []; const next = news.filter((item) => item.category === '美股'); dataModel.set('/finance/selectedCategory', '美股'); dataModel.set('/finance/visibleNews', next); actions.emit('financeCategoryChanged', { category: '美股', count: next.length });",
              "deps": [
                "/finance/news"
              ]
            }
          }
        },
        {
          "id": "financeCryptoButton",
          "component": "Button",
          "label": "加密",
          "shape": "pill",
          "size": "sm",
          "importance": "quiet",
          "style": {
            "color": "#d7b46a",
            "backgroundColor": "#16120a",
            "borderColor": "#3c2d18"
          },
          "action": {
            "script": {
              "code": "const news = dataModel.get('/finance/news') || []; const next = news.filter((item) => item.category === '加密'); dataModel.set('/finance/selectedCategory', '加密'); dataModel.set('/finance/visibleNews', next); actions.emit('financeCategoryChanged', { category: '加密', count: next.length });",
              "deps": [
                "/finance/news"
              ]
            }
          }
        },
        {
          "id": "financeMacroButton",
          "component": "Button",
          "label": "宏观",
          "shape": "pill",
          "size": "sm",
          "importance": "quiet",
          "style": {
            "color": "#d7b46a",
            "backgroundColor": "#16120a",
            "borderColor": "#3c2d18"
          },
          "action": {
            "script": {
              "code": "const news = dataModel.get('/finance/news') || []; const next = news.filter((item) => item.category === '宏观'); dataModel.set('/finance/selectedCategory', '宏观'); dataModel.set('/finance/visibleNews', next); actions.emit('financeCategoryChanged', { category: '宏观', count: next.length });",
              "deps": [
                "/finance/news"
              ]
            }
          }
        },
        {
          "id": "financeNewsList",
          "component": "List",
          "children": [
            {
              "path": "/finance/visibleNews",
              "componentId": "financeNewsItem"
            }
          ],
          "emptyText": "暂无资讯",
          "itemRole": "card",
          "dividers": false
        },
        {
          "id": "financeNewsItem",
          "component": "Card",
          "child": "financeNewsItemBody",
          "role": "interactive",
          "density": "compact",
          "variant": "filled",
          "style": {
            "backgroundColor": "#12100c",
            "borderColor": "#332713",
            "borderRadius": "18px"
          }
        },
        {
          "id": "financeNewsItemBody",
          "component": "Row",
          "children": [
            "financeNewsCopy",
            "financeNewsActions"
          ],
          "role": "mediaObject",
          "alignment": "center",
          "distribution": "spaceBetween",
          "gap": "10px",
          "wrap": false
        },
        {
          "id": "financeNewsCopy",
          "component": "Column",
          "children": [
            "financeNewsMeta",
            "financeNewsTitle",
            "financeNewsSource"
          ],
          "gap": "5px",
          "style": {
            "minWidth": "0"
          }
        },
        {
          "id": "financeNewsMeta",
          "component": "Row",
          "children": [
            "financeNewsCategory",
            "financeNewsImpact"
          ],
          "role": "metadata",
          "gap": "6px",
          "wrap": false
        },
        {
          "id": "financeNewsCategory",
          "component": "Text",
          "text": {
            "path": "category"
          },
          "usageHint": "caption",
          "style": {
            "color": "#e1c16e",
            "fontWeight": 900
          }
        },
        {
          "id": "financeNewsImpact",
          "component": "Text",
          "text": {
            "path": "impact"
          },
          "role": "status",
          "emphasis": "warning",
          "usageHint": "caption"
        },
        {
          "id": "financeNewsTitle",
          "component": "Text",
          "text": {
            "path": "title"
          },
          "usageHint": "body",
          "truncate": true,
          "style": {
            "color": "#fff7df",
            "fontWeight": 800,
            "minWidth": "0"
          }
        },
        {
          "id": "financeNewsSource",
          "component": "Text",
          "text": {
            "path": "meta"
          },
          "usageHint": "caption",
          "style": {
            "color": "#8f8263"
          }
        },
        {
          "id": "financeNewsActions",
          "component": "Column",
          "children": [
            "financeSaveButton",
            "financeOpenButton"
          ],
          "gap": "6px",
          "alignment": "end"
        },
        {
          "id": "financeSaveButton",
          "component": "Button",
          "label": {
            "path": "savedLabel"
          },
          "size": "sm",
          "shape": "pill",
          "importance": "quiet",
          "style": {
            "color": "#f5d58a",
            "backgroundColor": "#1d160c",
            "borderColor": "#4b3715"
          },
          "action": {
            "script": {
              "code": "const id = String(context.newsId || ''); const news = dataModel.get('/finance/news') || []; const visibleNews = dataModel.get('/finance/visibleNews') || []; const toggle = (item) => { if (item.id !== id) return item; const saved = !item.saved; return { ...item, saved, savedLabel: saved ? '已藏' : '收藏' }; }; const nextNews = news.map(toggle); const nextVisible = visibleNews.map(toggle); const saved = Boolean(nextVisible.find((item) => item.id === id)?.saved); dataModel.set('/finance/news', nextNews); dataModel.set('/finance/visibleNews', nextVisible); actions.emit('financeNewsSaved', { id, saved });",
              "deps": [
                "/finance/news",
                "/finance/visibleNews"
              ],
              "context": {
                "newsId": {
                  "path": "id"
                }
              }
            }
          }
        },
        {
          "id": "financeOpenButton",
          "component": "Button",
          "label": "详情",
          "size": "sm",
          "intent": "warning",
          "shape": "pill",
          "action": {
            "event": {
              "name": "openFinanceNews",
              "context": {
                "id": {
                  "path": "id"
                },
                "title": {
                  "path": "title"
                },
                "category": {
                  "path": "category"
                }
              }
            }
          }
        },
        {
          "id": "financeFooter",
          "component": "Button",
          "label": "查看行情日历",
          "icon": "calendar_today",
          "intent": "warning",
          "shape": "rounded",
          "fullWidth": true,
          "action": {
            "event": {
              "name": "openMarketCalendar",
              "context": {
                "category": {
                  "path": "/finance/selectedCategory"
                },
                "subscribed": {
                  "path": "/finance/subscribed"
                }
              }
            }
          }
        }
      ]
    }
  }
]
```

为什么好：它把金融资讯拆成 hero、指标网格、分类操作、新闻列表和页脚事件；筛选和收藏都写回 dataModel；List 模板渲染 visibleNews；列表项使用相对 path 和 context；主题视觉通过受控 style、role、density、variant、shape、intent 等字段表达。

## Good Case 3: Work Board

```json
[
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "main",
      "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
    }
  },
  {
    "version": "v0.9",
    "updateDataModel": {
      "surfaceId": "main",
      "path": "/",
      "value": {
        "todo": {
          "draft": "补充 Slider 视觉回归",
          "items": [
            {
              "id": "task-1",
              "title": "整理 Basic Catalog 能力矩阵",
              "project": "Renderer",
              "done": true,
              "priority": "High"
            },
            {
              "id": "task-2",
              "title": "补齐表单组件截图测试",
              "project": "QA",
              "done": false,
              "priority": "Medium"
            },
            {
              "id": "task-3",
              "title": "验证 JSRuntime 安全边界",
              "project": "Runtime",
              "done": false,
              "priority": "High"
            }
          ]
        }
      }
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "main",
      "components": [
        {
          "id": "root",
          "component": "Container",
          "child": "todoCard",
          "width": "content",
          "padding": "none"
        },
        {
          "id": "todoCard",
          "component": "Card",
          "child": "todoBody",
          "role": "summary",
          "density": "comfortable",
          "variant": "elevated",
          "header": "Renderer 待办清单",
          "subtitle": "复选框和按钮脚本都会改写 dataModel"
        },
        {
          "id": "todoBody",
          "component": "Column",
          "children": [
            "todoSummary",
            "todoComposer",
            "todoList",
            "todoActions"
          ],
          "gap": "14px"
        },
        {
          "id": "todoSummary",
          "component": "Text",
          "text": {
            "script": {
              "code": "const items = dataModel.get('/todo/items') || []; const done = items.filter((item) => item.done).length; return `${done}/${items.length} completed · ${items.length - done} open`; ",
              "deps": [
                "/todo/items"
              ],
              "fallback": "0/0 completed"
            }
          },
          "role": "status",
          "emphasis": "success",
          "usageHint": "caption"
        },
        {
          "id": "todoComposer",
          "component": "Grid",
          "columns": "auto",
          "minItemWidth": "180px",
          "gap": "8px",
          "children": [
            "todoDraftField",
            "todoAddButton"
          ]
        },
        {
          "id": "todoDraftField",
          "component": "TextField",
          "label": "新增任务",
          "text": {
            "path": "/todo/draft"
          },
          "usageHint": "shortText",
          "placeholder": "输入任务标题",
          "density": "compact",
          "helpText": "添加后会清空输入框。"
        },
        {
          "id": "todoAddButton",
          "component": "Button",
          "label": "添加",
          "icon": "plus",
          "intent": "primary",
          "shape": "pill",
          "action": {
            "script": {
              "code": "const title = String(dataModel.get('/todo/draft') || '').trim(); if (!title) { actions.emit('todoSkipped', { reason: 'empty' }); return; } const items = dataModel.get('/todo/items') || []; const next = [...items, { id: `task-${items.length + 1}`, title, project: 'Renderer Lab', done: false, priority: 'Normal' }]; dataModel.set('/todo/items', next); dataModel.set('/todo/draft', ''); actions.emit('todoAdded', { title, total: next.length });",
              "deps": [
                "/todo/items",
                "/todo/draft"
              ]
            }
          }
        },
        {
          "id": "todoList",
          "component": "List",
          "children": [
            {
              "path": "/todo/items",
              "componentId": "todoItem"
            }
          ],
          "emptyText": "暂无任务",
          "itemRole": "card",
          "dividers": true
        },
        {
          "id": "todoItem",
          "component": "Card",
          "child": "todoItemBody",
          "role": "summary",
          "density": "compact",
          "variant": "plain"
        },
        {
          "id": "todoItemBody",
          "component": "Row",
          "children": [
            "todoCheck",
            "todoTitle",
            "todoMeta",
            "todoPriority"
          ],
          "role": "mediaObject",
          "alignment": "center",
          "distribution": "spaceBetween",
          "gap": "10px",
          "wrap": false
        },
        {
          "id": "todoCheck",
          "component": "CheckBox",
          "value": {
            "path": "done"
          },
          "density": "compact"
        },
        {
          "id": "todoTitle",
          "component": "Text",
          "text": {
            "path": "title"
          },
          "usageHint": "body",
          "truncate": true,
          "style": {
            "minWidth": "86px"
          }
        },
        {
          "id": "todoMeta",
          "component": "Column",
          "children": [
            "todoProject",
            "todoState"
          ],
          "gap": "3px"
        },
        {
          "id": "todoProject",
          "component": "Text",
          "text": {
            "path": "project"
          },
          "usageHint": "caption",
          "emphasis": "muted"
        },
        {
          "id": "todoState",
          "component": "Text",
          "text": "复选框写回",
          "role": "status",
          "emphasis": "success",
          "usageHint": "caption"
        },
        {
          "id": "todoPriority",
          "component": "Text",
          "text": {
            "path": "priority"
          },
          "role": "status",
          "emphasis": "warning",
          "usageHint": "caption",
          "truncate": true
        },
        {
          "id": "todoActions",
          "component": "Row",
          "children": [
            "clearDoneButton",
            "todoOpenCount"
          ],
          "role": "actions",
          "distribution": "spaceBetween",
          "alignment": "center",
          "wrap": false
        },
        {
          "id": "clearDoneButton",
          "component": "Button",
          "label": "清理已完成",
          "intent": "secondary",
          "size": "sm",
          "action": {
            "script": {
              "code": "const items = dataModel.get('/todo/items') || []; const next = items.filter((item) => !item.done); dataModel.set('/todo/items', next); actions.emit('completedCleared', { removed: items.length - next.length, remaining: next.length });",
              "deps": [
                "/todo/items"
              ]
            }
          }
        },
        {
          "id": "todoOpenCount",
          "component": "Text",
          "text": {
            "script": {
              "code": "const items = dataModel.get('/todo/items') || []; return `${items.filter((item) => !item.done).length} open`; ",
              "deps": [
                "/todo/items"
              ],
              "fallback": "0 open"
            }
          },
          "usageHint": "caption",
          "emphasis": "muted"
        }
      ]
    }
  }
]
```

为什么好：它把草稿输入和任务列表放入 dataModel；TextField 绑定可编辑 draft；List 模板渲染任务卡；CheckBox 写回 item 状态；新增和清理按钮使用 action.script 做本地数组更新并回传事件；顶部和底部统计通过属性 script 从列表派生。
