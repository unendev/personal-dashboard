import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// Type definitions for category structure
interface CategoryNode {
  name: string;
  children?: CategoryNode[];
}

interface DeleteRequest {
  type: 'top' | 'mid' | 'sub';
  path: string;
  name: string;
}

interface CreateRequest {
  type: 'top' | 'mid' | 'sub';
  parentPath?: string;
  name: string;
}

export async function GET() {
  try {
    const jsonDirectory = path.join(process.cwd(), 'data');
    const fileContents = await fs.readFile(jsonDirectory + '/log-categories.json', 'utf8');
    const categories = JSON.parse(fileContents) as CategoryNode[];
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Failed to read log categories:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { type, parentPath, name } = await request.json() as CreateRequest;
    
    if (!name || name.trim() === '') {
      return new NextResponse('分类名称不能为空', { status: 400 });
    }
    
    const jsonDirectory = path.join(process.cwd(), 'data');
    const filePath = jsonDirectory + '/log-categories.json';
    const fileContents = await fs.readFile(filePath, 'utf8');
    const categories = JSON.parse(fileContents) as CategoryNode[];
    
    let updatedCategories: CategoryNode[] = [...categories];
    
    if (type === 'top') {
      // Create top-level category
      const newCategory: CategoryNode = { name: name.trim() };
      updatedCategories.push(newCategory);
    } else if (type === 'mid') {
      // Create mid-level category under parentPath (top category name)
      updatedCategories = categories.map((cat: CategoryNode) => {
        if (cat.name === parentPath) {
          return {
            ...cat,
            children: [...(cat.children || []), { name: name.trim() }]
          };
        }
        return cat;
      });
    } else if (type === 'sub') {
      // Create sub-level category under parentPath (topName/midName)
      const [topName, midName] = (parentPath || '').split('/');
      updatedCategories = categories.map((cat: CategoryNode) => {
        if (cat.name === topName) {
          return {
            ...cat,
            children: cat.children?.map((midCat: CategoryNode) => {
              if (midCat.name === midName) {
                return {
                  ...midCat,
                  children: [...(midCat.children || []), { name: name.trim() }]
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
    console.error('Failed to create category:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    console.log('DELETE request body:', body);
    
    const { type, path: categoryPath, name } = body as DeleteRequest;
    
    if (!type || !name) {
      console.error('Missing required fields:', { type, name });
      return new NextResponse('Missing required fields', { status: 400 });
    }
    
    const jsonDirectory = path.join(process.cwd(), 'data');
    const filePath = jsonDirectory + '/log-categories.json';
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error('File does not exist:', filePath);
      return new NextResponse('Categories file not found', { status: 404 });
    }
    
    // Read file with error handling
    let fileContents: string;
    try {
      fileContents = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error('Failed to read file:', error);
      return new NextResponse('Failed to read categories file', { status: 500 });
    }
    
    let categories: CategoryNode[];
    try {
      categories = JSON.parse(fileContents) as CategoryNode[];
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      return new NextResponse('Invalid JSON in categories file', { status: 500 });
    }
    
    console.log('Current categories:', JSON.stringify(categories, null, 2));
    console.log('Delete request:', { type, categoryPath, name });
    
    let updatedCategories: CategoryNode[] = [...categories];
    
    if (type === 'top') {
      // Delete top-level category
      console.log('Deleting top-level category:', name);
      updatedCategories = categories.filter((cat: CategoryNode) => cat.name !== name);
    } else if (type === 'mid') {
      // Delete mid-level category - categoryPath is the top category name
      console.log('Deleting mid-level category:', { categoryPath, name });
      updatedCategories = categories.map((cat: CategoryNode) => {
        if (cat.name === categoryPath) {
          return {
            ...cat,
            children: cat.children?.filter((child: CategoryNode) => child.name !== name) || []
          };
        }
        return cat;
      });
    } else if (type === 'sub') {
      // Delete sub-level category - categoryPath is "topName/midName"
      const [topName, midName] = categoryPath.split('/');
      console.log('Deleting sub-level category:', { topName, midName, name });
      updatedCategories = categories.map((cat: CategoryNode) => {
        if (cat.name === topName) {
          return {
            ...cat,
            children: cat.children?.map((midCat: CategoryNode) => {
              if (midCat.name === midName) {
                return {
                  ...midCat,
                  children: midCat.children?.filter((subCat: CategoryNode) => subCat.name !== name) || []
                };
              }
              return midCat;
            }) || []
          };
        }
        return cat;
      });
    } else {
      console.error('Invalid delete type:', type);
      return new NextResponse('Invalid delete type', { status: 400 });
    }
    
    console.log('Updated categories:', JSON.stringify(updatedCategories, null, 2));
    
    // Write back to file with error handling
    try {
      await fs.writeFile(filePath, JSON.stringify(updatedCategories, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to write file:', error);
      return new NextResponse('Failed to save categories', { status: 500 });
    }
    
    return NextResponse.json({ success: true, categories: updatedCategories });
  } catch (error) {
    console.error('Failed to delete category:', error);
    return new NextResponse(`Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}
