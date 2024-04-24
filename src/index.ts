type Fn<P extends any[] = any[], R extends any = any> = (...args: P) => R

export type Vdata = {
  name: string
  attribute?: Map<string, any[]>
  children?: any[]
}

type Config = {
  compilerAttribute?: (
    strs: TemplateStringsArray,
    vals: any[],
    cut: string,
    defaultValue: any,
    format: (s: string) => any
  ) => {
    attribute: Map<string, any[]>
  } & { [s in string]: any }
  cut?: string
  defaultValue?: any
  formatValue?: (val: string) => any
  transform?: <T extends Vdata = Vdata>(data: T, _: any) => any
  id?: string | symbol
}

export class Vway<T extends Vdata = Vdata> extends Function {
  private _call
  data
  id
  conf
  constructor(data: T, call: Fn, id?: string | symbol, conf?: any) {
    super()
    this._call = call
    this.data = data
    if (id) this.id = id
    if (conf) this.conf = conf
    return new Proxy(this, {
      apply: (target, _, args) => target._call.apply(target, args)
    })
  }
}

const isTemp = (args: any[]): args is [strs: TemplateStringsArray, ...vals: any[]] =>
  Array.isArray(args[0]) &&
  args[0].every(s => typeof s === 'string') &&
  args[0].hasOwnProperty('raw') &&
  args.length === args[0].length

const reg = /^(?![0-9-_.])[\w-.:]+$/
const err = (i: number) => new Error('compilerAttribute: TemplateStrings format error code: ' + i)
const isPlainObject = (val: unknown) => Object.prototype.toString.call(val) === '[object Object]'
const quots = ["'", '"']
const t2ois = {
  str: (str: string) => quots.some(q => str.startsWith(q) && str.endsWith(q)),
  num: (str: string) => !t2ois.str(str) && !isNaN(Number(str)),
  bool: (str: string) => ['true', 'false'].includes(str.toLowerCase()),
  null: (str: string) => str.toLowerCase() === 'null'
}
const formatValue = (val: string) => {
  if (t2ois.str(val)) return val.slice(1, -1)
  else if (t2ois.num(val)) return Number(val)
  else if (t2ois.bool(val)) return val.toLowerCase() === 'true'
  else if (t2ois.null(val)) return null
  return val
}

const compilerAttribute = (
  strs: TemplateStringsArray,
  vals: any[],
  cut: string,
  defaultValue: any,
  format: (s: string) => any
) => {
  let attribute = new Map<string, any[]>()
  let setParm = (key: string, val: any) => {
    let arr = attribute.get(key)
    if (!arr) attribute.set(key, (arr = []))
    arr.push(val)
  }

  let tags = [...strs.raw]

  // 删除首尾空格
  tags.unshift(tags.shift()!.replace(/^\s*/g, ''))
  tags.push(tags.pop()!.replace(/\s*$/g, ''))

  tags = tags.map(str => str.split(/\s+/)).flat()

  let prev: string | undefined
  let current: string | undefined
  let key: string = ''
  let val: any
  let clear = () => {
    key = ''
    val = void 0
  }
  while (tags.length > 0) {
    current = tags.shift()!

    // 遇到 空字符串 \ cut结尾 代表有插入动态数据
    if (current === '' || current.endsWith(cut)) {
      prev = current
      current = tags.shift()!
      if (current === '') {
        if (prev === '') {
          val = vals.shift()
          if (isPlainObject(val)) {
            for (key in val) setParm(key, val[key])
            clear()
          } else throw err(1)
        } else {
          const key = prev!.slice(0, -1)
          if (reg.test(key)) {
            val = vals.shift()
            setParm(key, val)
            clear()
          } else throw err(2)
        }
      } else throw err(3)
      prev = void 0
      current = void 0
    }
    // 正常字符串
    else {
      // 当存在一个引号且结尾不是另一种引号时，代表字符串当中存在空格被切割，需要从新拼接
      while (
        ((current.match(/"/g) || []).length === 1 && !current.endsWith("'")) ||
        ((current.match(/'/g) || []).length === 1 && !current.endsWith('"'))
      )
        current += ' ' + tags.shift()!

      let ci = current.indexOf(cut)
      if (ci > -1) {
        if (ci === 0) throw err(4)
        let key = current.slice(0, ci)

        if (reg.test(key)) {
          val = format(current.slice(ci + 1))
          setParm(key, val)
          clear()
        } else throw err(5)
      } else {
        if (reg.test(current)) setParm(current, defaultValue)
        else throw err(6)
      }
      current = void 0
    }
  }

  return { attribute }
}

const puppet: any = {}

const defConfig = {
  compilerAttribute,
  cut: '=',
  defaultValue: true,
  formatValue,
  transform: <T>(data: T, _: any) => data
}

export const init = <T extends Vdata = Vdata, R extends any = Vdata>(config: Config = {}) => {
  let _conf = { ...defConfig, ...config }

  let toCall = function (this: Vway<T>, ...children: any[]) {
    let { data: d, conf } = this
    let data = Object.assign(children.length ? { children } : {}, d) as T

    return _conf.transform<T>(data, conf) as unknown as R
  }

  let handle = (conf?: any) => ({
    get: (_: any, name: string) =>
      new Vway<T>(
        { name } as T,
        function (this: Vway<T>, ...args: any[]) {
          if (isTemp(args)) {
            let [strs, ...vals] = args
            return new Vway<T>(
              {
                ..._conf.compilerAttribute(strs, vals, _conf.cut, _conf.defaultValue, _conf.formatValue),
                name
              } as T,
              toCall,
              _conf.id,
              conf
            )
          }
          return toCall.apply(this, args)
        },
        _conf.id,
        conf
      )
  })

  return new Proxy((conf: any) => new Proxy(puppet, handle(conf)), handle())
}
