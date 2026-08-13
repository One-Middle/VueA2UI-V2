<!--
自动生成文件，请勿手动修改。
权威源：packages/agent/src/skills/*.ts
生成命令：pnpm --filter @a2ui-platform/agent skill:docs
-->

---
skill: "A2UI v0.9 组件消息生成"
id: "high-quality-a2ui-good-cases"
title: "高质量 A2UI Good Case"
description: "复杂 UI 或需要质量标杆时请求；包含 Live Commerce（亮色电商）、Finance Brief（黑金金融）、Work Board（清爽工具）三个完整 good case，覆盖三种视觉范式。"
---

# 高质量 A2UI Good Case

本 Reference 收录完整、可审查的高质量 A2UI 标杆。三个 case 分别展示三种视觉范式：亮色电商（Live Commerce）、黑金金融（Finance Brief）、清爽工具（Work Board）。

## Good Case 1: Live Commerce

亮色电商视觉范式：白色卡片 + 圆角阴影 + 橙色系品牌色 + 暗色操作栏对比。

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
        "live": {
          "badge": "直播中",
          "title": "农夫山泉 好礼相送",
          "cta": "去逛逛",
          "viewers": "3000+",
          "likes": "1444",
          "cover": "data:image/svg+xml,%0A%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20720%20520%22%3E%0A%20%20%3Cdefs%3E%3ClinearGradient%20id%3D%22w%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23dff7d4%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23f8fafc%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22c%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%220%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%23d7b47a%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23f4d99d%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22b%22%3E%3CfeGaussianBlur%20stdDeviation%3D%2218%22%2F%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%0A%20%20%3Crect%20width%3D%22720%22%20height%3D%22520%22%20fill%3D%22%23efe6d2%22%2F%3E%0A%20%20%3Crect%20x%3D%22420%22%20y%3D%2224%22%20width%3D%22164%22%20height%3D%22216%22%20rx%3D%228%22%20fill%3D%22url(%23w)%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M444%2036v190M484%2036v190M524%2036v190M564%2036v190M430%2096h144M430%20156h144%22%20stroke%3D%22%23b7d8a9%22%20stroke-width%3D%225%22%20opacity%3D%220.55%22%2F%3E%0A%20%20%3Crect%20x%3D%2232%22%20y%3D%2270%22%20width%3D%22214%22%20height%3D%22142%22%20rx%3D%2212%22%20fill%3D%22%23baa37f%22%2F%3E%0A%20%20%3Crect%20x%3D%2252%22%20y%3D%2292%22%20width%3D%2248%22%20height%3D%2234%22%20rx%3D%224%22%20fill%3D%22%23f8fafc%22%20opacity%3D%220.65%22%2F%3E%0A%20%20%3Crect%20x%3D%22112%22%20y%3D%2292%22%20width%3D%2246%22%20height%3D%2234%22%20rx%3D%224%22%20fill%3D%22%23f8fafc%22%20opacity%3D%220.58%22%2F%3E%0A%20%20%3Crect%20x%3D%22170%22%20y%3D%2292%22%20width%3D%2242%22%20height%3D%2234%22%20rx%3D%224%22%20fill%3D%22%23f8fafc%22%20opacity%3D%220.5%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%22286%22%20cy%3D%22116%22%20r%3D%2234%22%20fill%3D%22%23efe9dc%22%20stroke%3D%22%239c8b70%22%20stroke-width%3D%225%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M286%2096v22l17%2012%22%20stroke%3D%22%23766853%22%20stroke-width%3D%225%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M342%2076h38v92h-38z%22%20fill%3D%22%23f2f6ef%22%2F%3E%3Cpath%20d%3D%22M360%2076v-38%22%20stroke%3D%22%23415349%22%20stroke-width%3D%227%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M330%20118c28-22%2062-22%2088%200%22%20fill%3D%22%236d8472%22%2F%3E%0A%20%20%3Crect%20x%3D%220%22%20y%3D%22314%22%20width%3D%22720%22%20height%3D%22118%22%20fill%3D%22url(%23c)%22%2F%3E%0A%20%20%3Crect%20x%3D%220%22%20y%3D%22432%22%20width%3D%22720%22%20height%3D%2288%22%20fill%3D%22%237a6b54%22%20opacity%3D%220.78%22%2F%3E%0A%20%20%3Cellipse%20cx%3D%22362%22%20cy%3D%22374%22%20rx%3D%22250%22%20ry%3D%2248%22%20fill%3D%22%23efe1bd%22%20opacity%3D%220.5%22%20filter%3D%22url(%23b)%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M320%20170c48-24%20104%204%20108%2062l6%20100h-158l8-102c3-27%2015-47%2036-60z%22%20fill%3D%22%23f8fafc%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M300%20214c-38%2036-56%2078-50%20126%22%20stroke%3D%22%23f8fafc%22%20stroke-width%3D%2232%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M428%20224c36%2030%2052%2064%2056%20106%22%20stroke%3D%22%23f8fafc%22%20stroke-width%3D%2232%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%22356%22%20cy%3D%22142%22%20r%3D%2242%22%20fill%3D%22%23e6b28a%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M318%20134c8-44%2076-52%2096-9-20%204-42%202-62-7-10%2013-21%2018-34%2016z%22%20fill%3D%22%23172121%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M334%20178c18%2014%2042%2014%2058%200%22%20stroke%3D%22%23b98060%22%20stroke-width%3D%225%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%2F%3E%0A%20%20%3Cpath%20d%3D%22M224%20336c50-34%20112-36%20164%200%22%20fill%3D%22%23d4b87e%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%22258%22%20cy%3D%22320%22%20r%3D%2218%22%20fill%3D%22%236aa84f%22%2F%3E%3Ccircle%20cx%3D%22290%22%20cy%3D%22312%22%20r%3D%2220%22%20fill%3D%22%239ac36b%22%2F%3E%3Ccircle%20cx%3D%22326%22%20cy%3D%22320%22%20r%3D%2218%22%20fill%3D%22%236aa84f%22%2F%3E%0A%20%20%3Crect%20x%3D%22458%22%20y%3D%22320%22%20width%3D%2278%22%20height%3D%2252%22%20rx%3D%2210%22%20fill%3D%22%23f7f7f2%22%20stroke%3D%22%23c7bfa8%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%3Crect%20x%3D%22538%22%20y%3D%22322%22%20width%3D%2272%22%20height%3D%2246%22%20rx%3D%2222%22%20fill%3D%22%23f2c2b8%22%2F%3E%0A%20%20%3Crect%20x%3D%22268%22%20y%3D%22250%22%20width%3D%22124%22%20height%3D%2238%22%20rx%3D%2210%22%20transform%3D%22rotate(12%20330%20269)%22%20fill%3D%22%23ffffff%22%2F%3E%0A%20%20%3Crect%20x%3D%22276%22%20y%3D%22255%22%20width%3D%2250%22%20height%3D%2228%22%20rx%3D%225%22%20transform%3D%22rotate(12%20301%20269)%22%20fill%3D%22%23d71920%22%2F%3E%0A%20%20%3Crect%20x%3D%22332%22%20y%3D%22262%22%20width%3D%2246%22%20height%3D%2212%22%20rx%3D%223%22%20transform%3D%22rotate(12%20355%20268)%22%20fill%3D%22%2393c47d%22%2F%3E%0A%3C%2Fsvg%3E"
        },
        "product": {
          "sku": "spring-water-5l-4",
          "brand": "天猫",
          "title": "农夫山泉旗舰店红盖5l*4桶饮用水",
          "detail": "详情",
          "price": "¥31.9",
          "subsidy": "补贴价",
          "sales": "已售3万+",
          "benefit": "淘宝秒杀 直降9.6元",
          "thumbnail": "data:image/svg+xml,%0A%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20160%20160%22%3E%0A%20%20%3Crect%20width%3D%22160%22%20height%3D%22160%22%20rx%3D%2218%22%20fill%3D%22%23f8fafc%22%2F%3E%0A%20%20%3Crect%20x%3D%2226%22%20y%3D%2270%22%20width%3D%2282%22%20height%3D%2256%22%20rx%3D%228%22%20fill%3D%22%23ffffff%22%20stroke%3D%22%23e5e7eb%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%3Crect%20x%3D%2230%22%20y%3D%2282%22%20width%3D%2274%22%20height%3D%2226%22%20rx%3D%224%22%20fill%3D%22%23d71920%22%2F%3E%0A%20%20%3Ctext%20x%3D%2239%22%20y%3D%22101%22%20fill%3D%22%23ffffff%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2216%22%20font-weight%3D%22700%22%3E%E5%B1%B1%E6%B3%89%3C%2Ftext%3E%0A%20%20%3Crect%20x%3D%2292%22%20y%3D%2234%22%20width%3D%2234%22%20height%3D%2294%22%20rx%3D%229%22%20fill%3D%22%23e0f2fe%22%20stroke%3D%22%2393c5fd%22%20stroke-width%3D%224%22%2F%3E%0A%20%20%3Crect%20x%3D%2296%22%20y%3D%2262%22%20width%3D%2226%22%20height%3D%2228%22%20rx%3D%224%22%20fill%3D%22%23d71920%22%2F%3E%0A%20%20%3Crect%20x%3D%2298%22%20y%3D%2224%22%20width%3D%2222%22%20height%3D%2214%22%20rx%3D%224%22%20fill%3D%22%23ef4444%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%2242%22%20cy%3D%2255%22%20r%3D%2214%22%20fill%3D%22%2322c55e%22%2F%3E%3Ccircle%20cx%3D%2264%22%20cy%3D%2248%22%20r%3D%2218%22%20fill%3D%22%2384cc16%22%2F%3E%0A%3C%2Fsvg%3E"
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
          "child": "liveCard",
          "width": "content",
          "padding": "none"
        },
        {
          "id": "liveCard",
          "component": "Card",
          "child": "liveBody",
          "role": "media",
          "density": "compact",
          "variant": "plain",
          "style": {
            "padding": "0",
            "borderRadius": "20px",
            "borderColor": "transparent",
            "shadow": "md",
            "backgroundColor": "#ffffff",
            "overflow": "hidden"
          }
        },
        {
          "id": "liveBody",
          "component": "Column",
          "children": [
            "heroImage",
            "liveStrip",
            "productShelf",
            "commerceActions"
          ],
          "gap": "0"
        },
        {
          "id": "heroImage",
          "component": "Image",
          "url": {
            "path": "/live/cover"
          },
          "alt": "Live kitchen",
          "role": "hero",
          "shape": "square",
          "fit": "cover",
          "aspectRatio": "16:13"
        },
        {
          "id": "liveStrip",
          "component": "Row",
          "children": [
            "liveTitleGroup",
            "liveVisit"
          ],
          "role": "actions",
          "distribution": "spaceBetween",
          "alignment": "center",
          "wrap": false,
          "style": {
            "padding": "10px 12px",
            "backgroundColor": "#3d3b36",
            "gap": "10px"
          }
        },
        {
          "id": "liveTitleGroup",
          "component": "Row",
          "children": [
            "liveBadge",
            "liveTitle"
          ],
          "role": "metadata",
          "alignment": "center",
          "gap": "8px",
          "wrap": false
        },
        {
          "id": "liveBadge",
          "component": "Text",
          "text": {
            "path": "/live/badge"
          },
          "usageHint": "caption",
          "role": "discount",
          "style": {
            "padding": "2px 6px",
            "borderRadius": "4px",
            "backgroundColor": "#ff2f64",
            "color": "#ffffff",
            "fontWeight": "800"
          }
        },
        {
          "id": "liveTitle",
          "component": "Text",
          "text": {
            "path": "/live/title"
          },
          "usageHint": "body",
          "truncate": true,
          "style": {
            "color": "#ffffff",
            "fontWeight": "700",
            "minWidth": "0"
          }
        },
        {
          "id": "liveVisit",
          "component": "Button",
          "label": {
            "path": "/live/cta"
          },
          "icon": "chevron_right",
          "iconPosition": "right",
          "importance": "quiet",
          "shape": "pill",
          "action": {
            "event": {
              "name": "openLiveRoom",
              "context": {
                "title": {
                  "path": "/live/title"
                }
              }
            }
          },
          "style": {
            "color": "#ffffff",
            "padding": "4px 0",
            "minWidth": "64px"
          }
        },
        {
          "id": "productShelf",
          "component": "Row",
          "children": [
            "productThumb",
            "productInfo"
          ],
          "role": "mediaObject",
          "gap": "10px",
          "alignment": "center",
          "wrap": false,
          "style": {
            "padding": "10px 12px 6px"
          }
        },
        {
          "id": "productThumb",
          "component": "Image",
          "url": {
            "path": "/product/thumbnail"
          },
          "alt": "Product thumbnail",
          "role": "thumbnail",
          "shape": "rounded",
          "fit": "cover",
          "aspectRatio": "1:1",
          "style": {
            "width": "46px"
          }
        },
        {
          "id": "productInfo",
          "component": "Column",
          "children": [
            "productTitleRow",
            "priceRow",
            "benefitRow"
          ],
          "gap": "4px",
          "style": {
            "minWidth": "0",
            "flex": 1
          }
        },
        {
          "id": "productTitleRow",
          "component": "Row",
          "children": [
            "productBrand",
            "productTitle",
            "productDetail"
          ],
          "role": "metadata",
          "alignment": "center",
          "gap": "4px",
          "wrap": false
        },
        {
          "id": "productBrand",
          "component": "Text",
          "text": {
            "path": "/product/brand"
          },
          "usageHint": "body",
          "role": "discount",
          "style": {
            "fontWeight": "800"
          }
        },
        {
          "id": "productTitle",
          "component": "Text",
          "text": {
            "path": "/product/title"
          },
          "usageHint": "body",
          "emphasis": "strong",
          "truncate": true,
          "style": {
            "minWidth": "0"
          }
        },
        {
          "id": "productDetail",
          "component": "Text",
          "text": {
            "script": {
              "code": "return `${dataModel.get('/product/detail')} ›`;",
              "deps": [
                "/product/detail"
              ],
              "fallback": "详情 ›"
            }
          },
          "usageHint": "caption",
          "emphasis": "muted",
          "style": {
            "minWidth": "38px"
          }
        },
        {
          "id": "priceRow",
          "component": "Row",
          "children": [
            "productPrice",
            "productSubsidy",
            "productSales"
          ],
          "role": "metadata",
          "alignment": "end",
          "gap": "4px",
          "wrap": false
        },
        {
          "id": "productPrice",
          "component": "Text",
          "text": {
            "path": "/product/price"
          },
          "role": "price",
          "variant": "metric",
          "tone": "warning",
          "style": {
            "fontSize": "22px"
          }
        },
        {
          "id": "productSubsidy",
          "component": "Text",
          "text": {
            "path": "/product/subsidy"
          },
          "role": "discount",
          "usageHint": "caption"
        },
        {
          "id": "productSales",
          "component": "Text",
          "text": {
            "path": "/product/sales"
          },
          "usageHint": "caption",
          "emphasis": "muted"
        },
        {
          "id": "benefitRow",
          "component": "Text",
          "text": {
            "path": "/product/benefit"
          },
          "usageHint": "caption",
          "role": "discount",
          "style": {
            "textAlign": "right"
          }
        },
        {
          "id": "commerceActions",
          "component": "Row",
          "children": [
            "socialStats",
            "cartButton",
            "buyButton"
          ],
          "role": "actions",
          "alignment": "center",
          "gap": "8px",
          "wrap": false,
          "style": {
            "padding": "8px 12px 12px"
          }
        },
        {
          "id": "socialStats",
          "component": "Row",
          "children": [
            "commentMetric",
            "starMetric"
          ],
          "role": "metadata",
          "gap": "10px",
          "wrap": false,
          "style": {
            "minWidth": "88px"
          }
        },
        {
          "id": "commentMetric",
          "component": "Column",
          "children": [
            "commentIcon",
            "commentCount"
          ],
          "gap": "2px",
          "alignment": "center"
        },
        {
          "id": "commentIcon",
          "component": "Icon",
          "icon": "chat_bubble",
          "semantic": "comment",
          "label": "comments",
          "size": "md"
        },
        {
          "id": "commentCount",
          "component": "Text",
          "text": {
            "path": "/live/viewers"
          },
          "usageHint": "caption",
          "emphasis": "muted"
        },
        {
          "id": "starMetric",
          "component": "Column",
          "children": [
            "starIcon",
            "starCount"
          ],
          "gap": "2px",
          "alignment": "center"
        },
        {
          "id": "starIcon",
          "component": "Icon",
          "icon": "star",
          "semantic": "favorite",
          "label": "favorites",
          "size": "md"
        },
        {
          "id": "starCount",
          "component": "Text",
          "text": {
            "path": "/live/likes"
          },
          "usageHint": "caption",
          "emphasis": "muted"
        },
        {
          "id": "cartButton",
          "component": "Button",
          "label": "加入购物车",
          "intent": "warning",
          "shape": "rounded",
          "importance": "prominent",
          "fullWidth": true,
          "action": {
            "event": {
              "name": "addToCart",
              "context": {
                "sku": {
                  "path": "/product/sku"
                },
                "title": {
                  "path": "/product/title"
                }
              }
            }
          }
        },
        {
          "id": "buyButton",
          "component": "Button",
          "label": "立即购买",
          "intent": "danger",
          "shape": "rounded",
          "importance": "prominent",
          "fullWidth": true,
          "style": {
            "backgroundColor": "#ff5a1f"
          },
          "action": {
            "event": {
              "name": "buyNow",
              "context": {
                "sku": {
                  "path": "/product/sku"
                },
                "price": {
                  "path": "/product/price"
                },
                "title": {
                  "path": "/product/title"
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

为什么好——架构层面：dataModel 按 /live 和 /product 域名聚合；hero 图片 + 直播信息条 + 商品货架 + 双购买 CTA 分层明确；社交指标和价格通过 data binding 关联；购物车和立即购买使用 action.event 提交业务事件。

为什么好——视觉层面：外层 Card 使用 borderRadius: "20px" + shadow: "md" + overflow: "hidden" 做圆角裁剪；暗色操作栏（backgroundColor: "#3d3b36"）与白色卡片形成层次对比；直播标签使用 backgroundColor: "#ff2f64" 红色强调；立即购买按钮用 backgroundColor: "#ff5a1f" 品牌橙；价格用 fontSize: "22px" + role: "price" + variant: "metric" 放大突出。

## Good Case 2: Finance Brief

黑金金融视觉范式：深色背景 + 暖金色文字 + 多层次边框 + 大圆角阴影。

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

为什么好——架构层面：金融资讯拆成 hero、指标网格、分类操作、新闻列表和页脚事件；筛选和收藏都写回 dataModel；List 模板渲染 visibleNews；列表项使用相对 path 和 context。

为什么好——视觉层面：外围 Card 使用 backgroundColor: "#080807" + color: "#f8edcf" + borderRadius: "24px" + shadow: "lg" 建立黑金基调；内部 hero 区块用 backgroundColor: "#14100a" + borderColor: "#3c2d18" + borderWidth: "1px" 拉开层次；指标卡用 backgroundColor: "#120f0a" 统一暗底；文字用三层金棕色（#fff7df / #d7b46a / #c8b98e）建立信息层级；分类标签通过 intent: "warning" vs importance: "quiet" 区分选中态。

## Good Case 3: Work Board

清爽工具视觉范式：浅色背景 + 白色卡片 + 蓝紫色品牌点缀 + 彩色指标卡 + 微阴影。

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
          "draft": "",
          "items": [
            {
              "id": "task-1",
              "title": "整理 Basic Catalog 能力矩阵",
              "project": "Renderer",
              "done": true
            },
            {
              "id": "task-2",
              "title": "补齐表单组件截图测试",
              "project": "QA",
              "done": false
            },
            {
              "id": "task-3",
              "title": "验证 JSRuntime 安全边界",
              "project": "Runtime",
              "done": false
            },
            {
              "id": "task-4",
              "title": "补充视觉设计指南 Reference",
              "project": "Skill",
              "done": true
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
          "subtitle": "复选框和按钮脚本都会改写 dataModel",
          "style": {
            "backgroundColor": "#ffffff",
            "borderRadius": "12px",
            "shadow": "sm"
          }
        },
        {
          "id": "todoBody",
          "component": "Column",
          "children": [
            "statsGrid",
            "todoComposer",
            "todoList",
            "todoActions"
          ],
          "gap": "14px"
        },
        {
          "id": "statsGrid",
          "component": "Grid",
          "columns": 3,
          "gap": "10px",
          "children": [
            "statTotal",
            "statActive",
            "statDone"
          ]
        },
        {
          "id": "statTotal",
          "component": "Card",
          "child": "statTotalBody",
          "role": "metric",
          "density": "compact",
          "variant": "filled",
          "style": {
            "backgroundColor": "#f5f3ff",
            "borderColor": "#ddd6fe",
            "borderRadius": "10px"
          }
        },
        {
          "id": "statTotalBody",
          "component": "Column",
          "children": [
            "statTotalLabel",
            "statTotalValue"
          ],
          "gap": "4px"
        },
        {
          "id": "statTotalLabel",
          "component": "Text",
          "text": "总计",
          "usageHint": "caption",
          "emphasis": "muted"
        },
        {
          "id": "statTotalValue",
          "component": "Text",
          "text": {
            "script": {
              "code": "const items = dataModel.get('/todo/items') || []; return String(items.length);",
              "deps": [
                "/todo/items"
              ],
              "fallback": "0"
            }
          },
          "role": "price",
          "variant": "metric",
          "usageHint": "h4",
          "style": {
            "color": "#7c3aed",
            "fontWeight": "800"
          }
        },
        {
          "id": "statActive",
          "component": "Card",
          "child": "statActiveBody",
          "role": "metric",
          "density": "compact",
          "variant": "filled",
          "style": {
            "backgroundColor": "#fffbeb",
            "borderColor": "#fde68a",
            "borderRadius": "10px"
          }
        },
        {
          "id": "statActiveBody",
          "component": "Column",
          "children": [
            "statActiveLabel",
            "statActiveValue"
          ],
          "gap": "4px"
        },
        {
          "id": "statActiveLabel",
          "component": "Text",
          "text": "进行中",
          "usageHint": "caption",
          "emphasis": "muted"
        },
        {
          "id": "statActiveValue",
          "component": "Text",
          "text": {
            "script": {
              "code": "const items = dataModel.get('/todo/items') || []; return String(items.filter((item) => !item.done).length);",
              "deps": [
                "/todo/items"
              ],
              "fallback": "0"
            }
          },
          "role": "price",
          "variant": "metric",
          "usageHint": "h4",
          "style": {
            "color": "#d97706",
            "fontWeight": "800"
          }
        },
        {
          "id": "statDone",
          "component": "Card",
          "child": "statDoneBody",
          "role": "metric",
          "density": "compact",
          "variant": "filled",
          "style": {
            "backgroundColor": "#f0fdf4",
            "borderColor": "#bbf7d0",
            "borderRadius": "10px"
          }
        },
        {
          "id": "statDoneBody",
          "component": "Column",
          "children": [
            "statDoneLabel",
            "statDoneValue"
          ],
          "gap": "4px"
        },
        {
          "id": "statDoneLabel",
          "component": "Text",
          "text": "已完成",
          "usageHint": "caption",
          "emphasis": "muted"
        },
        {
          "id": "statDoneValue",
          "component": "Text",
          "text": {
            "script": {
              "code": "const items = dataModel.get('/todo/items') || []; return String(items.filter((item) => item.done).length);",
              "deps": [
                "/todo/items"
              ],
              "fallback": "0"
            }
          },
          "role": "price",
          "variant": "metric",
          "usageHint": "h4",
          "style": {
            "color": "#16a34a",
            "fontWeight": "800"
          }
        },
        {
          "id": "todoComposer",
          "component": "Row",
          "children": [
            "todoDraftField",
            "todoAddButton"
          ],
          "role": "actions",
          "distribution": "spaceBetween",
          "alignment": "center",
          "gap": "8px",
          "wrap": false
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
          "style": {
            "backgroundColor": "#7c3aed"
          },
          "action": {
            "script": {
              "code": "const title = String(dataModel.get('/todo/draft') || '').trim(); if (!title) { actions.emit('todoSkipped', { reason: 'empty' }); return; } const items = dataModel.get('/todo/items') || []; const next = [...items, { id: `task-${items.length + 1}`, title, project: 'Renderer Lab', done: false }]; dataModel.set('/todo/items', next); dataModel.set('/todo/draft', ''); actions.emit('todoAdded', { title, total: next.length });",
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
          "emptyText": "暂无任务，用上方输入框添加",
          "itemRole": "card",
          "dividers": true
        },
        {
          "id": "todoItem",
          "component": "Card",
          "child": "todoItemBody",
          "role": "summary",
          "density": "compact",
          "variant": "plain",
          "style": {
            "backgroundColor": "#ffffff",
            "borderRadius": "8px"
          }
        },
        {
          "id": "todoItemBody",
          "component": "Row",
          "children": [
            "todoCheck",
            "todoTitle",
            "todoMeta",
            "todoToggleButton"
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
            "minWidth": "0",
            "flex": 1
          }
        },
        {
          "id": "todoMeta",
          "component": "Column",
          "children": [
            "todoProject",
            "todoStatus"
          ],
          "gap": "2px",
          "alignment": "end"
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
          "id": "todoStatus",
          "component": "Text",
          "text": {
            "script": {
              "code": "return dataModel.get('done') ? '已完成' : '进行中';",
              "deps": [
                "done"
              ],
              "fallback": "进行中"
            }
          },
          "role": "status",
          "emphasis": "success",
          "usageHint": "caption"
        },
        {
          "id": "todoToggleButton",
          "component": "Button",
          "label": {
            "script": {
              "code": "return dataModel.get('done') ? '已完成' : '完成';",
              "deps": [
                "done"
              ],
              "fallback": "完成"
            }
          },
          "intent": "secondary",
          "importance": "quiet",
          "size": "sm",
          "shape": "rounded",
          "action": {
            "script": {
              "code": "const id = String(context.itemId || ''); const items = dataModel.get('/todo/items') || []; dataModel.set('/todo/items', items.map((item) => item.id === id ? { ...item, done: !item.done } : item)); actions.emit('todoToggled', { id, done: !Boolean(items.find((item) => item.id === id)?.done) });",
              "deps": [
                "/todo/items"
              ],
              "context": {
                "itemId": {
                  "path": "id"
                }
              }
            }
          }
        },
        {
          "id": "todoActions",
          "component": "Row",
          "children": [
            "clearDoneButton",
            "todoSummary"
          ],
          "role": "actions",
          "distribution": "spaceBetween",
          "alignment": "center",
          "wrap": false,
          "style": {
            "paddingTop": "8px",
            "borderTop": "solid 1px #e5e7eb"
          }
        },
        {
          "id": "clearDoneButton",
          "component": "Button",
          "label": "清理已完成",
          "intent": "secondary",
          "size": "sm",
          "shape": "rounded",
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
          "id": "todoSummary",
          "component": "Text",
          "text": {
            "script": {
              "code": "const items = dataModel.get('/todo/items') || []; const done = items.filter((item) => item.done).length; return `${done}/${items.length} 已完成 · ${items.length - done} 待办`;",
              "deps": [
                "/todo/items"
              ],
              "fallback": "0/0 已完成"
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

为什么好——架构层面：草稿输入和任务列表放入 dataModel；顶部 3 列 Grid 指标卡通过属性 script 从 /todo/items 数组派生统计值；TextField 绑定可编辑 draft；List 模板渲染任务卡；CheckBox 写回 item 状态；新增和清理按钮使用 action.script 做本地数组更新并回传事件。

为什么好——视觉层面：整体浅色背景（#f8fafc）+ 白色卡片（backgroundColor: "#ffffff", borderRadius: "12px", shadow: "sm"）；顶部统计区用三色指标卡——紫色（#f5f3ff）表总数、琥珀色（#fffbeb）表进行中、绿色（#f0fdf4）表已完成；数值用对应颜色 fontWeight: "800" + usageHint: "h4"；添加按钮用 backgroundColor: "#7c3aed" 品牌紫强调主操作；底部操作区用 borderTop 分隔线区分层级；列表项用 borderRadius: "8px" 微圆角保持清爽。
