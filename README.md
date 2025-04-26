# Online Demo
Check to see if this is what you need to fix your image [here](https://cswap.mcallbos.co)

turns [this](wrong.png) into [this](upscaled_image.png)



# IMGColorSwap
A simple tool for swapping color channel values in pngs. Perfect for batch processing png assets with switched color channels.

## Usage
Replace any text in parentheses with your desired values. Avoid using spaces in folder names. By default, the utility swaps channels as follows: **Red → Green, Green → Red, Blue → Alpha, Alpha → Blue.**
(That is the channel swap needed to make Arcana Heart 3 images extracted with [unpac](https://github.com/super-continent/unPAC) look normal.)

### Basic Usage
To process images and save the corrected PNGs in the same folder:
```bash
./IMGCS.exe (Input Folder)
```

### Specifying an Output Folder
To save the corrected images to a different folder:
```bash
./IMGCS.exe -o (Output Folder) (Input Folder)
```
**Note:** Do not place any other options between `-o` and the output folder.

### Including Subfolders
To include subfolders in the PNG scanning, add the `-r` flag:
```bash
./IMGCS.exe -o (Output Folder) -r (Input Folder)
```

### Customizing Channel Swaps
To define a custom channel swap order, use `-order` followed by your desired RGBA sequence. For example:
```bash
./IMGCS.exe -o (Output Folder) -r -order GARB (Input Folder)
```
This swaps **Red → Green, Green → Alpha, Blue → Red, Alpha → Blue.**

--- 
