<template>
  <div class="chat">

    <!-- 聊天面板 -->
    <div class="chat__panel" >
      <div class="chat__head">
        机器人-youngpan
      </div>
      <div class="chat__box" ref="chatBox">
        <div class="chat__date">
          {{ new Date().getHours() + ':' + new Date().getMinutes()}}
        </div>
        <template v-for="(item, key) in message" :keys="key">
          <div class="chat__message" :class="{
            'right': item.name === 'myname'
            }">
            <p class="chat__message--name">{{ item.name }}</p>
            <div class="chat__message--text">
              <div class="chat__message--state" v-if="item.name === 'myname'">
                <rend-state :state="item.sendState"></rend-state>
              </div>

              {{item.text}}
            </div>
          </div>
        </template>
      </div>
    </div>
    <!-- 输入框 -->
    <div class="chat__input" contenteditable="true" ref="chatInput" @keyup.enter="sendMessage" placeholder="说点什么吧">
      说点什么吧..
    </div>
  </div>
</template>

<script>
import rendState from './rend-state.vue'
export default {
  name: 'chat',
  data() {
    return {
      message: [{
        text: 'nihao',
        dateline: (new Date()).valueOf(),
        name: 'youngpan'
      }]
    }
  },
  created () {

  },
  sockets: {
    say(text) {
      // 来了一条新消息
      let messageItem = {
        text,
        dateline: new Date().valueOf(),
        name: 'youngpan',
        sendState: 1
      }
      this.pushMessage(messageItem)
    }
  },
  components: {
    rendState
  },
  methods: {
    sendMessage() {
      let el = this.$refs.chatInput
      let text = el.innerText
      text = text.replace(/\s/g, '')
      if (!text) {
        return false
      }
      el.innerText = ''
      let messagekey = this.randomString()
      let messageItem = {
        text,
        dateline:  new Date().valueOf(),
        name: 'myname',
        sendState: 2, // 0 发送失败 1： 发送成功， 2： 发送中
        messagekey
      }
      // 推送消息
      this.pushMessage(messageItem)

      // 发送消息
      this.$socket.send(messageItem, {
        type: 'say',
        rep: messagekey
      }).then((data) => {
        console.log("----");
        // 发送成功
        messageItem.sendState = 1
      }).catch(() => {
        // 发送失败
        messageItem.sendState = 2
      })
    },
    pushMessage(data) {
      let chatBox = this.$refs.chatBox
      // 发送消息
      this.message.push(data)

      this.$nextTick(() => {
        chatBox.scrollTop = chatBox.scrollHeight
      })
    },
    randomString() {
      var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz';
      var maxPos = $chars.length;
      var pwd = '';
      for (let i = 0; i < 12; i++) {
        pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
      }
  　　return pwd
    }
  }
}
</script>
<style media="screen" lang="scss">
  .chat {
    font-size: 14px;
    margin: 10px auto;
    width: 80%;
    border: 1px solid #e5e5e5;
    height: 100%;
    display: flex;
    flex-direction:column;
    background-color: #fdfdfd;
  }
  .chat__box::-webkit-scrollbar {
      width: 5px;
      height: 5px;
      border-radius: 5px;
  }

  .chat__box::-webkit-scrollbar-track-piece {
      background-color: rgba(0,0,0,0);
  }

  .chat__box::-webkit-scrollbar-thumb:vertical {
      height: 5px;
      background-color: rgba(0,0,0,0.4);
      border-radius: 5px;
  }

  .chat__box::-webkit-scrollbar-thumb:horizontal {
      width: 5px;
      background-color: #999999;
  }

  .chat__panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    .chat__head {
      margin: 0 10px;
      height: 40px;
      line-height: 40px;
      text-align: center;
      border-bottom: 1px solid #e5e5e5;
    }
    .chat__box {
      flex: 1;
      overflow-y: hidden;
      overflow-x: hidden;
      padding: 10px 5px 10px 10px;
      margin-right: 5px;
    }
    .chat__box:hover{
      overflow-y: scroll;
      margin-right: 0px;
    }
  }
  .chat__input {
    height: 30%;
    max-height: 300px;
    border-top: 1px solid #e5e5e5;
    padding:10px 20px;
  }
  .chat__input:focus {
    outline: none;
  }
  .chat__date {
    text-align: center;
    font-size: 12px;
    line-height: 20px;
    color: #ccc;
  }



  .chat__message {
    max-width: 70%;
    clear: both;
    margin-top: 10px;
    p {
      margin: 0;
    }

    .chat__message--name {
      font-size: 14px;
      color: #333;
      font-weight: 600;
      line-height: 1;
      margin-bottom: 8px;
    }
    .chat__message--text {
      font-size: 12px;
      display: inline-block;
      line-height: 20px;
      background: #2bb48a;
      color: #fff;
      border-radius: 3px;
      padding: 3px 8px;
      text-align: left;
      position: relative;
      .chat__message--state {
        height: 100%;
        width: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        top:0px;
        right: -30px;
      }

    }
  }
  .chat__message.right {
    float: right;
    text-align: right;
    .chat__message--state {
      left: -30px;
    }
  }

</style>
