<template>
  <div id="app">
    <hello-word></hello-word>
  </div>
</template>

<script>
import HelloWord from './HelloWord.comp.vue'
export default {
  name: 'app',
  created () {
    
  },
  components: {
    HelloWord
  }
}
</script>
