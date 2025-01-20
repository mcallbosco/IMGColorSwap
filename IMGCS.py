from PIL import Image

def fix_png_channels(input_path, output_path, order):
    # Open the PNG image
    image = Image.open(input_path).convert("RGBA")  # Ensure it's in RGBA mode

    # Split into channels
    r, g, b, a = image.split()
    rgbaDict = {"R": r, "G": g, "B": b, "A": a}

    # Swap blue and alpha channels
    new_image = Image.merge("RGBA", (
        rgbaDict[order[0]],
        rgbaDict[order[1]],
        rgbaDict[order[2]],
        rgbaDict[order[3]]
    ))

    # Save the corrected image
    new_image.save(output_path)
    print(f"Fixed image saved to {output_path}")

# Get all pngs in a folder provided by an argument
import os
import sys
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fix PNG channels by swapping blue and alpha channels.")
    parser.add_argument("input_folder", help="Path to the input folder containing PNG files.")
    parser.add_argument("-o", "--output_folder", help="Path to the output folder. If not provided, corrected images will be saved in the input folder with '_corrected' appended to the filename.")
    parser.add_argument("-r", "--recursive", action="store_true", help="Recursively process all PNG files in subdirectories.")
    parser.add_argument("-order", "--channel_order", default="GRAB", help="Order of channels to use. Type RGBA in whatever order with no spaces.")
    args = parser.parse_args()
    input_folder = args.input_folder
    output_folder = args.output_folder

    #check format of order
    for letter in args.channel_order:
        if letter not in "RGBA":
            raise ValueError("Channel order must be a permutation of 'RGBA'")
    
    if len(args.channel_order) != 4:
        raise ValueError("Channel order must be exactly 4 characters long.")

    if output_folder and not os.path.exists(output_folder):
        os.makedirs(output_folder)

    for root, dirs, files in os.walk(input_folder):
        for file in files:
            if file.lower().endswith(".png"):
                try:
                    input_path = os.path.join(root, file)
                    if output_folder:
                        output_path = os.path.join(output_folder, file)
                        exsists = os.path.exists(output_path)
                        inc = 0
                        while exsists:
                            output_path = os.path.join(output_folder, os.path.splitext(file)[0] + f"{inc}.png")
                            inc += 1
                            exsists = os.path.exists(output_path)
                    else:
                        output_path = os.path.join(root, os.path.splitext(file)[0] + "_corrected.png")
                        exsists = os.path.exists(output_path)
                        inc = 0
                        while exsists:
                            output_path = os.path.join(root, os.path.splitext(file)[0] + f"_corrected{inc}.png")
                            inc += 1
                            exsists = os.path.exists(output_path)
                    
                    fix_png_channels(input_path, output_path, args.channel_order)
                except Exception as e:
                    print(f"Error processing {os.path.join(root, file)}: {e}")
        
        if not args.recursive:
            break
    
