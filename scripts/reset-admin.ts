import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // List all users
    const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true }
    });
    console.log('Current users:', JSON.stringify(users, null, 2));

    // Find or create admin
    const adminEmail = 'admin@frelanceme.com';
    const newPassword = 'Admin@123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    let admin = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (admin) {
        // Update existing admin password
        await prisma.user.update({
            where: { email: adminEmail },
            data: { password: hashedPassword, role: 'ADMIN' }
        });
        console.log(`\nAdmin password reset!`);
    } else {
        // Create new admin
        admin = await prisma.user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                name: 'Admin',
                role: 'ADMIN',
                region: 'INDIA'
            }
        });
        console.log(`\nNew admin created!`);
    }

    console.log(`\n========================================`);
    console.log(`Admin Credentials:`);
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${newPassword}`);
    console.log(`========================================\n`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
