<template lang="html">
  <div class="send__state">
    <!-- 发送中 -->
    <img src="./image/loading.png" alt="" class="send__state--sending" v-if="state === 2">
    <!-- 发送失败 -->
    <img src="./image/fail.png" alt="fail"  v-if="state === 0">
    <!-- 发送成功 -->
    <img src="./image/success.png" alt="success" v-if="state === 1">
  </div>
</template>

<script>
export default {
  props: {
    state: {
      type: Number,
      default: 0,
    }
  }
}
</script>

<style lang="scss">
.send__state {
  width: 16px;
  height: 16px;
  img {
    width: 100%;
  }
  .send__state--sending {
    animation: rotating 1s linear infinite;
  }
}

@keyframes rotating {
  0%{
    transform: rotate(0deg);
  }
  100%{
    transform: rotate(360deg);
  }

}
</style>
