<template>
  <p v-if="!book"><button @click="loadepub">打开epub文件</button></p>
  <div class="viewer" v-else>
    <div class="doc">
      <div @click="doDownload(book)">下载全书</div>
      <div
        @click="openBook(item)"
        class="docitem"
        v-for="(item, idx) in book.content"
        :key="idx"
      >
        {{ item.label }}
      </div>
    </div>
    <div class="page">
      <iframe ref="iframe" class="book" />
    </div>
  </div>
</template>

<script >
import { defineComponent } from "vue";
import { useElectron } from "../use/electron";

export default defineComponent({
  name: "HelloWorld",
  setup() {
    const { selectePub, convertePub, itemPdfPath, download } = useElectron();
    return { selectePub, convertePub, itemPdfPath, download };
  },
  data() {
    return {
      book: false,
    };
  },
  methods: {
    async doDownload(book) {
      await this.download({
        ...book,
        content: book.content.map((i) => ({ ...i })),
      });
      this.$refs.iframe.src = `file://${book.output}`;
    },
    async openBook(item) {
      console.log(item);
      this.$refs.iframe.src = await this.itemPdfPath({ ...item });
    },
    async loadepub() {
      const result = await this.selectePub();
      if (result.filePaths.length > 0) {
        this.book = await this.convertePub(result.filePaths[0]);
      }
    },
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.viewer {
  display: flex;
  flex-direction: row;
}
.page {
  flex: 1;
}
.book {
  width: 100%;
  height: 100%;
}
</style>
