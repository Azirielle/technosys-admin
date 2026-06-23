import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyRoleAccess } from '@/lib/permissions';

export async function POST(request: Request) {
  try {
    const { authorized } = await verifyRoleAccess('employees', true);
    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Employee management write permissions required.' }, { status: 403 });
    }

    const { email, password, fullName, baseSalary, role, branchId, lifecycleStatus } = await request.json();

    let authUser = null;
    let createdNewAuth = false;

    // 1. Create the user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already exists') || authError.status === 422) {
        // Fetch users to locate the ID of the pre-existing user
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        const existingUser = listData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (!existingUser) {
          throw authError;
        }

        authUser = existingUser;
        // Optionally update the existing user's password and metadata to match the new inputs
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password,
          user_metadata: { full_name: fullName }
        });
        if (updateError) throw updateError;
      } else {
        throw authError;
      }
    } else {
      authUser = authData.user;
      createdNewAuth = true;
    }

    // 2. Insert or Update (upsert) in the custom profiles table
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authUser.id,
      full_name: fullName,
      role: role || 'technician',
      base_salary: baseSalary,
      branch_id: branchId || null,
      lifecycle_status: lifecycleStatus || 'active'
    });

    if (profileError) {
      // If we just created a new Auth user, delete it to keep database integrity
      if (createdNewAuth && authUser?.id) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      }
      throw profileError;
    }

    return NextResponse.json({ success: true, user: authUser });
  } catch (error: any) {
    console.error("Technician registration error:", error.message || error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

