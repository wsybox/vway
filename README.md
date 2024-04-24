## 一个描述 name, attribute, children 结构 的内部DSL

示例

```js
import { init } from './vway'

let t = init()
let { div, a, img, h1, p, button } = t

let dom = div(
  a`href="https://vitejs.dev" target="_blank"`(img`src=${src1} class="logo" alt="Vite logo"`()),
  a`href="https://www.typescriptlang.org/" target="_blank"`(
    img`src=${src2} class="logo vanilla" alt="TypeScript logo"`()
  ),
  h1('Vite + TypeScript'),
  div`class="card"`(button`id="counter" type="button"`()),
  p`class="read-the-docs"`('Click on the Vite and TypeScript logos to learn more')
)

console.log(dom)
```

函数名为name字段，模板字符串为attribute字段，最后括号里的参数则为 children 字段，注意，一般情况下，哪怕没有 children 字
段， 也不能省略最后的小括号，没有调用之前是一个 Vway对象，调用之后才拿到 数据，但是在没有 attribute 字段时模板字符串是可
以省略的，参考示例里的 h1 标签

---

可以在 init 时 配置 transform 选项，可以自定义 Vway 对象调用之后的返回值，示例如下

```js
import { init, Vway } from './vway'

const id = Symbol('html')
let t = init({
  id,
  transform({ name, attribute, children }) {
    let dom = document.createElement(name)
    attribute?.forEach((val, key) => {
      dom.setAttribute(key, val[0]) // attribute 的结构是 Map<string, any[]> 这里假设所有字段都只定义一次，只用作演示，不考虑更多复杂的情况
    })
    children?.forEach(item => {
      if (item instanceof Node || typeof item === 'string') dom.append(item)
      else if (item instanceof Vway && item?.id === id) dom.append(item()) // 如果children中有Vway对象，在这里手动调用，可以帮助没有 children 的Vway在书写时省略小括号
    })
    return dom
  }
})
let { div, a, img, h1, p, button } = t

let dom = div(
  a`href="https://vitejs.dev" target="_blank"`(img`src=${src1} class="logo" alt="Vite logo"`),
  a`href="https://www.typescriptlang.org/" target="_blank"`(
    img`src=${src2} class="logo vanilla" alt="TypeScript logo"` // 因为在 transform 当中进行了调用， 在这里就可以省略最后的小括号
  ),
  h1('Vite + TypeScript'),
  div`class="card"`(button`id="counter" type="button"`),
  p`class="read-the-docs"`('Click on the Vite and TypeScript logos to learn more')
)

document.querySelector('body')!.append(dom)
```
