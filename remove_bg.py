import sys
try:
    from PIL import Image
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow", "rembg"])
    from PIL import Image
    from rembg import remove

import os

input_path = "/Users/rahulraushan/Documents/DIGILo Application/public/logo.png"
output_path = "/Users/rahulraushan/Documents/DIGILo Application/public/logo-transparent.png"

try:
    with open(input_path, 'rb') as i:
        with open(output_path, 'wb') as o:
            input_data = i.read()
            output_data = remove(input_data)
            o.write(output_data)
    print("Background removed successfully using rembg!")
except Exception as e:
    print(f"Error with rembg, trying naive PIL thresholding: {e}")
    # Fallback to simple PIL if rembg fails
    img = Image.open(input_path)
    img = img.convert("RGBA")
    datas = img.getdata()
    
    # get top left pixel as bg color
    bg_color = datas[0]
    
    newData = []
    for item in datas:
        # if pixel is close to bg color, make transparent
        if abs(item[0] - bg_color[0]) < 30 and abs(item[1] - bg_color[1]) < 30 and abs(item[2] - bg_color[2]) < 30:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")
    print("Background removed using PIL fallback!")

