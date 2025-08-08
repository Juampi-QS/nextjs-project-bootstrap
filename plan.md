```markdown
# Comprehensive Development Plan for Interactive Sysadmin Documentation Manager

This plan outlines the integration of a Jira-like document management system into the Next.js project. The system will support document submission (with unique IDs), PostgreSQL database integration, and user management with role-based permissions. The project will be hosted on Linux/Windows VMs behind Apache or NGINX. All features will follow error-handling best practices and utilize modern, clean, and responsive UI design (using only typography, colors, spacing, and layout, with no external icon libraries).

---

## 1. Environment Setup & Dependency Management

- **.env File**  
  - **Action:** Create a root-level `.env` file containing sensitive credentials, e.g.:  
    ```
    DATABASE_URL="postgresql://<username>:<password>@localhost:5432/<database_name>?schema=public"
    JWT_SECRET="<your_jwt_secret>"
    ```  
  - **Error Handling:** Validate that the environment variables are loaded; log errors if missing.

- **Database ORM Integration (Prisma)**  
  - **Action:**  
    - Add dependencies to `package.json` for Prisma and its client:
      ```json
      "dependencies": {
        ...,
        "@prisma/client": "^X.X.X"
      },
      "devDependencies": {
        ...,
        "prisma": "^X.X.X"
      }
      ```
    - Create a new folder named `prisma` at the project root.
    - Create a file `prisma/schema.prisma` with the following models:
      ```prisma
      datasource db {
        provider = "postgresql"
        url      = env("DATABASE_URL")
      }

      generator client {
        provider = "prisma-client-js"
      }

      model User {
        id         Int      @id @default(autoincrement())
        name       String
        email      String   @unique
        password   String
        role       Role     @default(USER)
        createdAt  DateTime @default(now())
        documents  Document[]
      }

      model Document {
        id          String   @id @default(uuid()) // alternatively use nanoid for custom IDs
        title       String
        content     String
        status      Status   @default(TODO)
        createdAt   DateTime @default(now())
        updatedAt   DateTime @updatedAt
        author      User     @relation(fields: [authorId], references: [id])
        authorId    Int
      }

      enum Role {
        ADMIN
        EDITOR
        USER
      }

      enum Status {
        TODO
        IN_PROGRESS
        DONE
      }
      ```
    - Run `npx prisma generate` and `npx prisma migrate dev` (or appropriate migration command).

- **Optional Dependencies for Authentication**  
  - **Action:** Determine whether to use a solution like NextAuth.js or a custom JWT-based auth flow.  
  - **Plan:** For this project, a lightweight JWT session management via secure cookies will be implemented in custom API endpoints.

---

## 2. Database Integration Layer

- **File: `/src/lib/db.ts`**  
  - **Content:** Initialize and export the Prisma client.
    ```typescript
    import { PrismaClient } from '@prisma/client';
    let prisma: PrismaClient;

    if (process.env.NODE_ENV === 'production') {
      prisma = new PrismaClient();
    } else {
      if (!(global as any).prisma) {
        (global as any).prisma = new PrismaClient();
      }
      prisma = (global as any).prisma;
    }

    export default prisma;
    ```
  - **Error Handling:** Wrap critical DB calls in try-catch blocks in subsequent API endpoints.

---

## 3. API Endpoints

### A. Documents API

- **File: `/src/app/api/documents/route.ts`**  
  - **Features:**  
    - **GET:** Returns a list of documents.  
    - **POST:** Validates and submits new document data; generates a unique ID.
  - **Implementation Details:**
    ```typescript
    import { NextResponse } from 'next/server';
    import prisma from '@/lib/db';
    import { z } from 'zod';

    const documentSchema = z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      // status can be optional, defaults handled in DB
    });

    export async function GET() {
      try {
        const documents = await prisma.document.findMany({
          include: { author: true },
        });
        return NextResponse.json(documents);
      } catch (error) {
        return NextResponse.json({ error: 'Failed to retrieve documents' }, { status: 500 });
      }
    }

    export async function POST(request: Request) {
      try {
        const body = await request.json();
        const parsed = documentSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
        }
        // For unique document IDs, using Prisma's default UUID generation or incorporating nanoid if needed.
        const document = await prisma.document.create({
          data: {
            title: parsed.data.title,
            content: parsed.data.content,
            // Set authorId from session (placeholder: 1)
            author: { connect: { id: 1 } },
          },
        });
        return NextResponse.json(document, { status: 201 });
      } catch (error) {
        return NextResponse.json({ error: 'Document creation failed' }, { status: 500 });
      }
    }
    ```
  - **Error Handling:** Validate using Zod; errors result in HTTP 400 or 500 responses.

### B. Users API

- **File: `/src/app/api/users/route.ts`**  
  - **Features:**  
    - **GET:** Lists users (admin only).  
    - **POST:** Creates new users with roles.
  - **Implementation Details:**
    ```typescript
    import { NextResponse } from 'next/server';
    import prisma from '@/lib/db';
    import { z } from 'zod';

    const userSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(['ADMIN', 'EDITOR', 'USER']).optional(),
    });

    export async function GET(request: Request) {
      // Here, add authentication checks to ensure the requester is an ADMIN.
      try {
        const users = await prisma.user.findMany();
        return NextResponse.json(users);
      } catch (error) {
        return NextResponse.json({ error: 'Unable to fetch users' }, { status: 500 });
      }
    }

    export async function POST(request: Request) {
      try {
        const body = await request.json();
        const parsed = userSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
        }
        // Hash password logic should be added here (use bcrypt)
        const user = await prisma.user.create({
          data: {
            name: parsed.data.name,
            email: parsed.data.email,
            password: parsed.data.password, // In production, hash the password.
            role: parsed.data.role || 'USER',
          },
        });
        return NextResponse.json(user, { status: 201 });
      } catch (error) {
        return NextResponse.json({ error: 'User creation failed' }, { status: 500 });
      }
    }
    ```
  - **Error Handling:** Zod validation and try-catch blocks ensure graceful error reporting.

### C. Authentication API

- **File: `/src/app/api/login/route.ts`**  
  - **Features:**  
    - **POST:** Validates user credentials and returns a signed JWT token.
  - **Implementation Details:**  
    - Implement a lightweight JWT-based auth using a library like `jsonwebtoken` (to be added as dependency) and secure cookies.
    - Ensure error messages do not leak sensitive information.
  
---

## 4. Authentication & User Management Pages

### A. Login Page

- **File: `/src/app/login/page.tsx`**  
  - **Features:**  
    - A clean, modern login form using Tailwind CSS.
    - Fields: Email and Password.
    - On submit, send credentials to `/api/login`; on success, redirect to the dashboard.
  - **UI Considerations:**  
    - Use clear typography, proper spacing, and color contrasts.
    - Display error messages inline.
    
  - **Example Outline:**
    ```tsx
    'use client';
    import { useState } from 'react';
    import { useRouter } from 'next/navigation';

    export default function LoginPage() {
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [error, setError] = useState('');
      const router = useRouter();

      async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (res.ok) {
          router.push('/');
        } else {
          const data = await res.json();
          setError(data.error || 'Login failed');
        }
      }

      return (
        <main className="min-h-screen flex items-center justify-center bg-background">
          <form onSubmit={handleSubmit} className="p-8 bg-card shadow rounded-md w-full max-w-md">
            <h1 className="text-2xl mb-4 font-bold">Login</h1>
            {error && <p className="mb-4 text-red-600">{error}</p>}
            <label className="block mb-2">
              Email
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 p-2 border rounded w-full" 
              />
            </label>
            <label className="block mb-4">
              Password
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 p-2 border rounded w-full" 
              />
            </label>
            <button type="submit" className="w-full py-2 bg-primary text-primary-foreground rounded">
              Login
            </button>
          </form>
        </main>
      );
    }
    ```

### B. User Management Component for Admin

- **File: `/src/components/UserManagement.tsx`**  
  - **Features:**  
    - Display list of users.
    - Provide forms/buttons for adding/updating roles.
    - Accessible only to users with the ADMIN role.
  - **UI Considerations:**  
    - Clear tables or card listings; modern typography and well-spaced inputs.
  
---

## 5. Frontend UI Components & Pages

### A. Dashboard / Board View

- **File: `/src/app/page.tsx`**  
  - **Features:**  
    - Display a Jira-like board divided by document status columns: "To Do", "In Progress", "Done".
    - Include a header navigation with text links (Dashboard, Documents, User Management).
    - Allow filtering and sorting.
  - **UI Considerations:**  
    - Use a responsive grid layout (Tailwind CSS grid/flex utilities).
    - Maintain clear visual hierarchy (headings, spacing).
  - **Implementation Outline:**
    ```tsx
    'use client';
    import { useEffect, useState } from 'react';
    import DocumentCard from '@/components/DocumentCard';
    import DocumentForm from '@/components/DocumentForm';

    export default function DashboardPage() {
      const [documents, setDocuments] = useState([]);

      useEffect(() => {
        fetch('/api/documents')
          .then((res) => res.json())
          .then(setDocuments)
          .catch(console.error);
      }, []);

      // Group documents by status
      const groups = {
        TODO: documents.filter((d: any) => d.status === 'TODO'),
        IN_PROGRESS: documents.filter((d: any) => d.status === 'IN_PROGRESS'),
        DONE: documents.filter((d: any) => d.status === 'DONE'),
      };

      return (
        <div className="min-h-screen bg-background text-foreground">
          <header className="p-4 flex justify-between items-center border-b">
            <h1 className="text-xl font-bold">Documentation Manager</h1>
            <nav>
              <a className="px-2" href="/">Dashboard</a>
              <a className="px-2" href="/documents">Documents</a>
              <a className="px-2" href="/user-management">User Management</a>
            </nav>
          </header>
          <main className="p-4">
            <DocumentForm onDocumentCreated={(doc: any) => setDocuments([...documents, doc])} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {Object.entries(groups).map(([status, docs]) => (
                <section key={status}>
                  <h2 className="text-lg font-semibold mb-2">{status.replace('_', ' ')}</h2>
                  {docs.map((doc: any) => (
                    <DocumentCard key={doc.id} document={doc} />
                  ))}
                </section>
              ))}
            </div>
          </main>
        </div>
      );
    }
    ```

### B. Document Card Component

- **File: `/src/components/DocumentCard.tsx`**  
  - **Features:**  
    - Render a card showing the document title, unique ID, author info, and an excerpt.
    - On click, navigate to the document details page.
  - **UI Considerations:**  
    - Use a subtle shadow, padding, and border.  
    - No icons; rely on typography and spacing.
  - **Implementation Outline:**
    ```tsx
    import Link from 'next/link';

    export default function DocumentCard({ document }: { document: any }) {
      return (
        <Link href={`/documents/${document.id}`}>
          <div className="p-4 border rounded hover:shadow transition">
            <h3 className="font-bold text-lg">{document.title}</h3>
            <p className="text-sm text-muted mt-1">ID: {document.id}</p>
            <p className="mt-2 line-clamp-3">{document.content}</p>
          </div>
        </Link>
      );
    }
    ```

### C. Document Submission Form

- **File: `/src/components/DocumentForm.tsx`**  
  - **Features:**  
    - Form to submit new documents with fields for Title and Content.
    - On submission, sends a POST request to `/api/documents` and calls a provided callback on success.
  - **UI Considerations:**  
    - Clean input fields with clear labels and error alerts.
  - **Implementation Outline:**
    ```tsx
    'use client';
    import { useState } from 'react';

    export default function DocumentForm({ onDocumentCreated }: { onDocumentCreated: (doc: any) => void }) {
      const [title, setTitle] = useState('');
      const [content, setContent] = useState('');
      const [error, setError] = useState('');

      async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content }),
        });
        if (res.ok) {
          const doc = await res.json();
          onDocumentCreated(doc);
          setTitle('');
          setContent('');
          setError('');
        } else {
          const data = await res.json();
          setError(data.error || 'Submission failed');
        }
      }

      return (
        <form onSubmit={handleSubmit} className="mb-4 p-4 border rounded">
          {error && <div className="mb-2 text-red-600">{error}</div>}
          <div className="mb-4">
            <label className="block mb-1">Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full p-2 border rounded" 
              required 
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Content</label>
            <textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              className="w-full p-2 border rounded" 
              required 
              rows={4}
            />
          </div>
          <button type="submit" className="py-2 px-4 bg-primary text-primary-foreground rounded">Submit Document</button>
        </form>
      );
    }
    ```

### D. Document Details Page

- **File: `/src/app/documents/[docId]/page.tsx`**  
  - **Features:**  
    - Fetch and display complete document details based on the unique ID.
    - Handle “document not found” errors gracefully.
  - **UI Considerations:**  
    - Simple, clean layout with full text and metadata.

---

## 6. Hosting & Deployment

- **Deployment Instructions:**  
  - Update the `README.md` with steps to build and run the Next.js app using `npm run build` and `npm run start`.
  - Provide reverse proxy configuration samples for Apache or NGINX to forward requests to the Next.js server.
  - Ensure environment variables and SSL (if applicable) are configured for internal deployment.

---

## 7. Testing & Best Practices

- **API Testing:**  
  - Use `curl` commands as provided to test endpoints for document submission, user creation, and login.
  - Ensure error codes and responses are validated (e.g., HTTP 400 for validation errors, 500 for server errors).

- **Code Quality & Security:**  
  - Use Zod for input validation.
  - Wrap DB operations in try-catch.
  - Secure JWT tokens and cookies, and restrict API access based on user roles.
  - Log errors appropriately without exposing sensitive data.

---

## Summary

- Set up environment variables and integrate PostgreSQL via Prisma with models for users and documents.  
- Implement API routes for documents, users, and authentication, ensuring robust error handling and input validation.  
- Build modern, responsive UI pages for dashboard, document submission, details, and user management using Tailwind CSS without external icon libraries.  
- Introduce session management with JWT for internal authentication and role-based access control.  
- Document hosting and deployment steps are provided for Apache/NGINX reverse proxy setups.  
- Thorough testing using curl commands and adherence to best practices ensure secure and reliable operation.
