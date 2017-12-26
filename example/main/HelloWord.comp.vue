<template>
  <div class="helloword">
    可以测试socket
  </div>
</template>

<script>
export default {
  name: 'helloWord',
  created () {

  },
  sockets: {
    message(data) {
      console.log('message')
      console.log(data)
      console.log("name")
    }
  }
}
</script>
