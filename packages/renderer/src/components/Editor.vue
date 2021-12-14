<template>
  <p>Editor</p>
  <div v-for="(wav, idx) in wavs" :key="idx">{{ wav }}</div>
  <p />
</template>

<script >
import { defineComponent } from "vue";

export default defineComponent({
  name: "HelloWorld",
  computed: {
    wavs() {
      return this.$store.state.user.wavs;
    },
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
a {
  color: #42b983;
}
</style>
