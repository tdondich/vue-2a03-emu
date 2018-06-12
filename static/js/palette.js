Vue.component('palette', {
  props: ["size", "title"],
  data: function() {
    return {
      // Empty. Memory is now a non-reactive data element
    };
  },
  created() {
    this.realSize = this.size;
    this.$_memory = new Uint8Array(this.size);
    this.set = (address, value) => {
      // Check for mirrored address
      switch (address) {
        case 0x10:
          address = 0x00;
          break;
        case 0x14:
          address = 0x04;
          break;
        case 0x18:
          address = 0x08;
          break;
        case 0x1c:
          address = 0x0c;
          break;
      }

      this.$_memory[address] = value;
    };
    this.get = address => {
      switch (address) {
        case 0x10:
          address = 0x00;
          break;
        case 0x14:
          address = 0x04;
          break;
        case 0x18:
          address = 0x08;
          break;
        case 0x1c:
          address = 0x0c;
          break;
      }
      return this.$_memory[address];
    };
    this.getRange = (address, length) => {
      // Disable check for performance reasons
      /*
            if((address + (length - 1)) >= this.realSize) {
                throw "Address range exceeds memory size";
            }
            */
      return this.$_memory.slice(address, address + length);
    };
  },
  methods: {
   reset: function() {
      this.$_memory.fill(0);
    },
    // Fill a memory range with a specific value
    fill(value = 0x00, start = 0, end = this.$_memory.length) {
      this.$_memory.fill(value, start, end + 1);
    }
  },
  template: '<div class="palette"></div>'
});