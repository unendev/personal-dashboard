import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
  try {
    const jsonDirectory = path.join(process.cwd(), 'data');
    const fileContents = await fs.readFile(jsonDirectory + '/log-categories.json', 'utf8');
    const categories = JSON.parse(fileContents);
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Failed to read log categories:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { type, path: categoryPath, name } = await request.json();
    
    const jsonDirectory = path.join(process.cwd(), 'data');
    const filePath = jsonDirectory + '/log-categories.json';
    const fileContents = await fs.readFile(filePath, 'utf8');
    const categories = JSON.parse(fileContents);
    
    let updatedCategories = [...categories];
    
    if (type === 'top') {
      // Delete top-level category
      updatedCategories = categories.filter((cat: any) => cat.name !== name);
    } else if (type === 'mid') {
      // Delete mid-level category
      updatedCategories = categories.map((cat: any) => {
        if (cat.name === categoryPath) {
          return {
            ...cat,
            children: cat.children?.filter((child: any) => child.name !== name) || []
          };
        }
        return cat;
      });
    } else if (type === 'sub') {
      // Delete sub-level category
      const [topName, midName] = categoryPath.split('/');
      updatedCategories = categories.map((cat: any) => {
        if (cat.name === topName) {
          return {
            ...cat,
            children: cat.children?.map((midCat: any) => {
              if (midCat.name === midName) {
                return {
                  ...midCat,
                  children: midCat.children?.filter((subCat: any) => subCat.name !== name) || []
                };
              }
              return midCat;
            }) || []
          };
        }
        return cat;
      });
    }
    
    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(updatedCategories, null, 2), 'utf8');
    
    return NextResponse.json({ success: true, categories: updatedCategories });
  } catch (error) {
    console.error('Failed to delete category:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
