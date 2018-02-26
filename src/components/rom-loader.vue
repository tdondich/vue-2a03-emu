<template>
<div class="row">
    <div class="col-sm-12">
       <h2>ROM Cartridge Loader</h2> 
       <div class="alert alert-danger" v-if="loadError">
           {{loadError}}
       </div>
       <div class="alert alert-success" v-if="loadSuccess">
           {{loadSuccess}}
       </div>
       <p>
       <input v-model="romName"> <button @click="load">Load ROM</button>
       </p>
       <table class="table table-dark table-sm" v-if="loadSuccess">
            <thead>
                <tr>
                    <th>PRG ROM Size</th>
                    <th>CHR ROM Size</th>
                    <th>PRG RAM Size</th>
                    <th>Mirroring</th>
                    <th>Battery Backed</th>
                    <th>Trainer Exists</th>
                    <th>Ignore Mirroring</th>
                    <th>Mapping Number</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{{prgRomSize}}</td>
                    <td>{{chrRomSize}}</td>
                    <td>{{prgRamSize}}</td>
                    <td>{{mirroring}}</td>
                    <td>{{batteryBacked}}</td>
                    <td>{{trainerExists}}</td>
                    <td>{{ignoreMirroring}}</td>
                    <td>{{mappingNumber}}</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>
  
</template>

<script>
import axios from 'axios';

/**
Builds a String from a DataView (backed by an ArrayBuffer)
 */
function getStringFromDataView(view, offset = 0, length = view.byteLength - offset) {
    let value = new String();
    for(let count = 0; count < length; count++) {
        value = value + String.fromCharCode(view.getInt8(offset + count));
    }
    return value;
}

function copyToMemory(source, offset, length, target, address) {
    for(let count = 0; count < length; count++) {
        target.set(address + count, source[offset + count]);
    }
}

export default {

    data: function() {
        return {
            loadError: false,
            loadSuccess: false,
            data: null,
            romName: ''
        }
    },
    computed: {
        // Computed characteristics of the rom after being loaded
        // See: http://wiki.nesdev.com/w/index.php/INES
        prgRomSize() {
            return this.data[4];
        },
        chrRomSize() {
            return this.data[5];
        },
        prgRamSize() {
            // Default to 1 if value is 0 for backwards compatibility
            return this.data[8] == 0 ? 1 : this.data[8];
        },
        mirroring() {
            return ((this.data[6] & 0b00000001) == 0b00000001) ? 'vertical' : 'horizontal';
        },
        batteryBacked() {
            return (this.data[6] & 0b00000010) == 0b00000010;
        },
        trainerExists() {
            return (this.data[6] & 0b00000100) == 0b00000100;
        },
        ignoreMirroring() {
            return (this.data[6] & 0b00001000) == 0b00001000;
        },
        mappingNumber() {
            // Combine the nibbles of byte 6 and 7
            console.log("Original 6:" + this.data[6].toString(2).padStart(8, '0'));
            console.log("Original 8:" + this.data[6].toString(2).padStart(8, '0'));

            let lower = this.data[6] >>> 4;
            let upper = this.data[7] & 0b11110000;
            console.log("Lower: " + lower.toString(2));
            console.log("Upper: " + upper.toString(2));
            let mapping = upper | lower;
            console.log("Mapping: " + mapping.toString(2) + " or " + mapping);
            return mapping;
        },
        vsSystem() {
            return (this.data[8] & 0b00000001) == 0b00000001;
        },
        playChoice10() {
            return (this.data[8] & 0b00000010) == 0b00000010;
        },
        nes2Format() {
            return (this.data[8] & 0b00000100) == 0b00000100;
        },
        tvFormat() {
            return (this.data[9] & 0b00000001) == 0b00000001 ? 'pal' : 'ntsc';
        }
    },
    methods: {
        load() {
            this.loadError = this.loadSuccess = false;
            axios.get('/roms/' + this.romName + '.nes', {
                responseType: 'arraybuffer'
            })
            .then((response) => {
                // The response.data property is the arraybuffer of our binary data
                console.log("Retrieved rom.");
                // We assume this is a iNES file.
                // See: http://wiki.nesdev.com/w/index.php/INES

                // Fetch header from iNES file
                let header = new DataView(response.data, 0, 16);
                if(getStringFromDataView(header, 0, 3) != 'NES') {
                    this.loadError = "Invalid rom file provided";
                    return;
                }
                // Now assign to our data
                this.data = new Uint8Array(response.data);
                this.transfer();
                // Tell the cpu to reset and execute
                this.$parent.$refs.cpu.reset();
                this.loadSuccess = "Loaded " + this.romName + " ROM";
            })
            .catch((error) => {
                this.loadError = error.response.status + ": " + error.response.statusText;
            });
        },
        // Transfer copies contents into memory to be accessed by CPU
        transfer() {
            // Right now, we're only handling mapping 0 aka NROM
            // Copy over trainer, if it exists
            if(this.trainerExists) {
                // Copy the source data to the target address in memory
                copyToMemory(this.data, 16, 512, this.$parent.$refs.memory, 0x7000);
                copyToMemory(this.data, 16 + 512, this.prgRomSize * 16384, this.$parent.$refs.memory, 0x8000);
            } else {
                // Copy to 0x8000 prgRomSize * 16384 from offset 16
                console.log("Copying to memory");
                copyToMemory(this.data, 16, this.prgRomSize * 16384, this.$parent.$refs.memory, 0x8000);
                if(this.prgRomSize == 1 && this.mappingNumber == 0) {
                    // Mirror the prg rom to 0xc000
                    copyToMemory(this.data, 16, 16384, this.$parent.$refs.memory, 0xC000);
                }
            }
        }
    }
  
}
</script>

<style lang="sass" scoped>

</style>
