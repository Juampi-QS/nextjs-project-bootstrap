import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash('Cambiame123!', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@localhost' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@localhost',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  console.log('Created admin user:', admin)

  // Create some sample documents
  const sampleDoc1 = await prisma.document.create({
    data: {
      title: 'Server Maintenance Checklist',
      content: 'Weekly server maintenance tasks:\n1. Check disk space\n2. Review system logs\n3. Update security patches\n4. Backup verification',
      status: 'TODO',
      priority: 'HIGH',
      authorId: admin.id,
    },
  })

  const sampleDoc2 = await prisma.document.create({
    data: {
      title: 'Network Configuration Guide',
      content: 'Network setup documentation:\n1. Router configuration\n2. VLAN setup\n3. Firewall rules\n4. DNS configuration',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      authorId: admin.id,
    },
  })

  const sampleDoc3 = await prisma.document.create({
    data: {
      title: 'Backup Procedures',
      content: 'Daily backup procedures completed:\n1. Database backup\n2. File system backup\n3. Configuration backup\n4. Verification tests passed',
      status: 'DONE',
      priority: 'HIGH',
      authorId: admin.id,
    },
  })

  console.log('Created sample documents:', { sampleDoc1, sampleDoc2, sampleDoc3 })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
