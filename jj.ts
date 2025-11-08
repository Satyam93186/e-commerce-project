import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecommerce.com' },
    update: {},
    create: {
      email: 'admin@ecommerce.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      profile: {
        create: {
          firstName: 'Admin',
          lastName: 'User',
        },
      },
    },
  });

  // Create seller
  const sellerPassword = await bcrypt.hash('seller123', 10);
  const seller = await prisma.user.upsert({
    where: { email: 'seller@ecommerce.com' },
    update: {},
    create: {
      email: 'seller@ecommerce.com',
      passwordHash: sellerPassword,
      role: 'SELLER',
      profile: {
        create: {
          firstName: 'John',
          lastName: 'Seller',
        },
      },
    },
  });

  // Create buyer
  const buyerPassword = await bcrypt.hash('buyer123', 10);
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@ecommerce.com' },
    update: {},
    create: {
      email: 'buyer@ecommerce.com',
      passwordHash: buyerPassword,
      role: 'BUYER',
      profile: {
        create: {
          firstName: 'Jane',
          lastName: 'Buyer',
          addresses: {
            create: {
              street: '123 Main St',
              city: 'New York',
              state: 'NY',
              zipCode: '10001',
              country: 'USA',
              isDefault: true,
            },
          },
        },
      },
    },
  });

  // Create categories
  const electronics = await prisma.category.upsert({
    where: { name: 'Electronics' },
    update: {},
    create: {
      name: 'Electronics',
      description: 'Electronic devices and gadgets',
    },
  });

  const clothing = await prisma.category.upsert({
    where: { name: 'Clothing' },
    update: {},
    create: {
      name: 'Clothing',
      description: 'Fashion and apparel',
    },
  });

  const books = await prisma.category.upsert({
    where: { name: 'Books' },
    update: {},
    create: {
      name: 'Books',
      description: 'Books and literature',
    },
  });

  // Create products
  const product1 = await prisma.product.create({
    data: {
      name: 'iPhone 15 Pro',
      description: 'Latest iPhone with A17 Pro chip and titanium design',
      price: 999.99,
      categoryId: electronics.id,
      sellerId: seller.id,
      images: [
        'https://example.com/iphone-1.jpg',
        'https://example.com/iphone-2.jpg',
      ],
      stock: {
        create: {
          quantity: 50,
          reserved: 0,
        },
      },
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'MacBook Pro 16"',
      description: 'Powerful laptop with M3 Max chip',
      price: 2499.99,
      categoryId: electronics.id,
      sellerId: seller.id,
      images: ['https://example.com/macbook-1.jpg'],
      stock: {
        create: {
          quantity: 30,
          reserved: 0,
        },
      },
    },
  });

  const product3 = await prisma.product.create({
    data: {
      name: 'Nike Air Max',
      description: 'Comfortable running shoes',
      price: 129.99,
      categoryId: clothing.id,
      sellerId: seller.id,
      images: ['https://example.com/shoes-1.jpg'],
      stock: {
        create: {
          quantity: 100,
          reserved: 0,
        },
      },
    },
  });

  const product4 = await prisma.product.create({
    data: {
      name: 'The Great Gatsby',
      description: 'Classic novel by F. Scott Fitzgerald',
      price: 14.99,
      categoryId: books.id,
      sellerId: seller.id,
      images: ['https://example.com/book-1.jpg'],
      stock: {
        create: {
          quantity: 200,
          reserved: 0,
        },
      },
    },
  });

  console.log('✅ Seed data created successfully');
  console.log({
    users: { admin, seller, buyer },
    categories: { electronics, clothing, books },
    products: { product1, product2, product3, product4 },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
