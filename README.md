# vue-plugin-reconnectWebsocket

Vue 2 plugin for reconnecting WebSocket clients.

This plugin installs a reconnecting WebSocket instance on `Vue.prototype` as
`this.$socket`, and adds a component-level `sockets` option so Vue components
can subscribe to socket events with automatic cleanup on destroy.

## Features

- Designed for Vue 2.
- Exposes the socket instance as `this.$socket`.
- Supports component-level `sockets` event handlers.
- Automatically binds socket listeners in `beforeCreate`.
- Automatically removes component socket listeners in `beforeDestroy`.
- Accepts either an existing socket instance or a socket config object.
- Keeps the underlying reconnecting WebSocket API available.

## Relationship With `reconnect-websocket`

This package is the Vue integration layer. The socket behavior itself comes
from the underlying reconnecting WebSocket client.

The underlying client provides:

- Automatic reconnect.
- Promise-based `send`.
- Optional reply waiting with timeout.
- `beforeSendHook` and `beforeEmitHook`.
- Events such as `connect`, `reconnect`, `message`, `close`, and `error`.

## Browser Support

Use a browser environment that supports:

- `WebSocket`
- `Promise`
- `Proxy`
- `Object.defineProperty`

For older browsers, provide the required polyfills before installing the plugin.

## Installation

This repository contains source code and build scripts. Build the package before
using files from `dist/`.

```bash
npm install
npm run build
```

After build, the generated files are configured as:

- `dist/vue-plugin-reconentWebsockt.js` - UMD build for browsers.
- `dist/vue-plugin-reconentWebsockt.min.js` - minified UMD build.
- `dist/vue-plugin-reconentWebsockt.common.js` - CommonJS build.
- `dist/vue-plugin-reconentWebsockt.esm.js` - ES module build.

> Naming note: this repository and build configuration contain historical
> spelling variants such as `reconenct` and `reconent`. The package name in
> `package.json` is `vue-plugin-reconnectWebsocket`, while the source currently
> imports `reconenct-websockets`. Verify package names before publishing or
> installing from npm.

## Quick Start

```js
import Vue from 'vue'
import VueSocket from 'vue-plugin-reconnectWebsocket'

Vue.use(VueSocket, {
  url: 'ws://localhost:3000',
  reconnect: true,
  autoconnect: true,
  reconnectTime: 10,
  beforeEmitHook(event) {
    return JSON.parse(event.data)
  }
})

new Vue({
  el: '#app',
  render: h => h(App)
})
```

Then use `this.$socket` and the `sockets` component option:

```js
export default {
  name: 'ChatPanel',

  sockets: {
    connect() {
      console.log('socket connected')
    },

    reconnect() {
      console.log('socket reconnected')
    },

    message(event) {
      console.log(event.data)
    },

    chat(event) {
      this.messages.push(event.data)
    }
  },

  methods: {
    sendMessage(text) {
      return this.$socket.send({
        type: 'chat',
        data: text
      })
    }
  }
}
```

## Install With Existing Socket Instance

If you already created a socket instance, pass it to `Vue.use`.

```js
import Vue from 'vue'
import VueSocket from 'vue-plugin-reconnectWebsocket'

const socket = new VueSocket('ws://localhost:3000', {
  beforeEmitHook(event) {
    return JSON.parse(event.data)
  }
})

Vue.use(VueSocket, socket)
```

## Install With Config Object

If the second argument has a `url` field, the plugin creates the socket
internally.

```js
Vue.use(VueSocket, {
  url: 'ws://localhost:3000',
  reconnect: true,
  autoconnect: true,
  reconnectTime: 10
})
```

## Component `sockets` Option

The `sockets` option maps socket event names to component methods.

```js
export default {
  sockets: {
    connect(event) {
      console.log(event.type)
    },

    say(text) {
      this.messages.push(text)
    },

    close(event) {
      console.log('closed', event)
    }
  }
}
```

Handlers are registered with the component instance as their context, so `this`
points to the Vue component.

When the component is destroyed, the plugin removes all handlers declared in
`sockets`.

## Dynamic Event Binding

The plugin replaces `this.$options.sockets` with a `Proxy`, so assigning and
deleting handlers also binds and unbinds socket listeners.

```js
export default {
  created() {
    this.$options.sockets.notice = this.handleNotice
  },

  beforeDestroy() {
    delete this.$options.sockets.notice
  },

  methods: {
    handleNotice(event) {
      console.log(event)
    }
  }
}
```

## Sending Messages

Use the underlying socket instance through `this.$socket`.

```js
this.$socket
  .send(
    {
      type: 'say',
      data: 'hello'
    },
    {
      rep: 'say-success',
      timeout: 5000,
      retry: true
    }
  )
  .then(event => {
    console.log('message sent', event)
  })
  .catch(error => {
    console.error(error)
  })
```

If `rep` is provided, the Promise resolves when that event is emitted. If the
reply event is not emitted before `timeout`, the Promise rejects.

## Incoming JSON Messages

Use `beforeEmitHook` to parse server messages and route them by `type`.

```js
Vue.use(VueSocket, {
  url: 'ws://localhost:3000',
  beforeEmitHook(event) {
    try {
      return JSON.parse(event.data)
    } catch (error) {
      return false
    }
  }
})
```

For this server message:

```json
{
  "type": "say",
  "data": "hello"
}
```

The component handler below will run:

```js
export default {
  sockets: {
    say(event) {
      console.log(event.data)
    }
  }
}
```

## Outgoing Message Hook

Use `beforeSendHook` to normalize outgoing messages before the underlying
WebSocket sends them.

```js
Vue.use(VueSocket, {
  url: 'ws://localhost:3000',
  beforeSendHook(options, send) {
    options.data = JSON.stringify({
      type: options.type || 'message',
      data: options.data
    })

    send(options)
  }
})
```

## Socket Config

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `url` | `string` | required for config install | WebSocket URL used by the plugin when creating a socket internally. |
| `protocol` | `string \| string[]` | `''` | WebSocket subprotocol. |
| `reconnect` | `boolean` | `true` | Whether to reconnect automatically after unexpected close. |
| `autoconnect` | `boolean` | `true` | Whether to connect immediately after socket creation. |
| `reconnectTime` | `number` | `10` | Maximum automatic reconnect counter before emitting `reconnet-fail`. |
| `binaryType` | `'blob' \| 'arraybuffer'` | `'blob'` | Binary data type for the native WebSocket. |
| `beforeSendHook` | `function` | `undefined` | Hook called before each send. |
| `beforeEmitHook` | `function` | `undefined` | Hook called before each incoming message is emitted. |

## Socket Events

| Event | Description |
| --- | --- |
| `open` | Native WebSocket `open` event. |
| `connect` | First successful connection. |
| `reconnect` | Successful connection after reconnect. |
| `message` | Native WebSocket message event when no custom `beforeEmitHook` changes the event type. |
| `close` | Native WebSocket `close` event. |
| `error` | Native WebSocket error or internal send error. |
| `reconnet-fail` | Emitted when automatic reconnect exceeds the retry counter. The event name keeps the current source spelling. |
| Custom event | Any event object returned by `beforeEmitHook` with a `type` field. |

## Development

```bash
npm install
npm run build
```

Run the demo server:

```bash
npm run dev
```

Run the webpack dev server:

```bash
npm run start
```

The example app is in `example/main`.

## License

ISC
