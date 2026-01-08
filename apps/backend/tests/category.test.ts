import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Category from '@/models/category';
import { RootType } from '@repo/shared';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';

describe('Category API Integration Test', () => {
  const agent = request.agent(app);

  const TEST_USER_EMAIL = 'test_category@example.com';
  const TEST_USER_PASSWORD = 'password';
  let userId = '';

  beforeAll(async () => {
    // 1. Ensure User Fresh Start
    await User.destroy({ where: { email: TEST_USER_EMAIL }, force: true });

    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    const user = await User.create({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: 'CategoryTestUser',
    } as any);
    userId = user.id;

    // Login
    const loginRes = await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    if (loginRes.status !== StatusCodes.OK) {
      throw new Error('Login failed: ' + JSON.stringify(loginRes.body));
    }
  });

  // Cleanup test data created during tests
  // We will track created IDs and delete them?
  // Or just let them be (if unique names)?
  // Ideally cleanup.
  const createdCategoryIds: string[] = [];

  afterAll(async () => {
    if (createdCategoryIds.length > 0) {
      await Category.destroy({ where: { id: createdCategoryIds } });
    }
    // Cleanup User
    await User.destroy({ where: { email: TEST_USER_EMAIL }, force: true });
  });

  it('GET /api/category should return category tree', async () => {
    const res = await agent.get('/api/category');
    expect(res.status).toBe(StatusCodes.OK);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Check for some default root categories (MainType used as keys in frontend, but RootType here)
    const roots = res.body.data;
    // We expect RootNodes (Income, Expense, Operate) are implicitly returned or User categories?
    // Based on getAllCategories logic: fetches User + Null(System).
    // System definitions have parentId=null too (from Seeder).
    // So roots should verify existence of system defaults.
    // e.g. Name: '支出', Type: EXPENSE
    const expenseRoot = roots.find(
      (c: any) => c.name === '支出' && c.parentId === null
    );
    expect(expenseRoot).toBeDefined();
    expect(expenseRoot.children.length).toBeGreaterThan(0);
  });

  it('POST /api/category should create a Main Category (User Defined)', async () => {
    // Correct approach: Find valid system Root Category first
    const systemRoot = await Category.findOne({
      where: { parentId: null, type: RootType.EXPENSE },
    });
    expect(systemRoot).toBeDefined();

    const newMainCategory = {
      name: 'Test Main Category',
      type: RootType.EXPENSE,
      parentId: systemRoot!.id, // Must be attached to a Root
      icon: 'test-icon',
      color: '#000000',
    };

    const res = await agent.post('/api/category').send(newMainCategory);
    expect(res.status).toBe(StatusCodes.CREATED);

    // Verify creation
    const created = await Category.findOne({
      where: { name: 'Test Main Category', userId },
    });
    expect(created).toBeDefined();
    expect(created?.type).toBe(RootType.EXPENSE);
    expect(created?.parentId).toBe(systemRoot!.id); // Should match System Root

    if (created) createdCategoryIds.push(created.id);
  });

  it('POST /api/category should create a Sub Category under Main Category', async () => {
    // First verify 'Test Main Category' exists from previous test
    // Better to create a fresh parent for this test to be independent?
    // Or reuse. Let's reuse for hierarchy test flow.

    const parent = await Category.findOne({
      where: { name: 'Test Main Category', userId },
    });
    expect(parent).toBeDefined();

    const newSubCategory = {
      name: 'Test Sub Category',
      type: RootType.EXPENSE,
      parentId: parent!.id,
      // Test defaults mechanism: Don't send icon/color
    };

    const res = await agent.post('/api/category').send(newSubCategory);
    expect(res.status).toBe(StatusCodes.CREATED);

    const created = await Category.findOne({
      where: { name: 'Test Sub Category', parentId: parent!.id },
    });
    expect(created).toBeDefined();
    expect(created?.icon).toBe('tag'); // Default
    expect(created?.color).toBe('#3b82f6'); // Default

    if (created) createdCategoryIds.push(created.id);
  });

  it('PUT /api/category/:id should update category details', async () => {
    const parent = await Category.findOne({
      where: { name: 'Test Main Category', userId },
    });
    if (!parent) throw new Error('Parent Setup failed');

    const updateData = {
      name: 'Updated Main Category',
      color: '#ffffff',
      type: RootType.EXPENSE, // Full update required now
    };

    const res = await agent.put(`/api/category/${parent.id}`).send(updateData);
    expect(res.status).toBe(StatusCodes.OK);

    const updated = await Category.findByPk(parent.id);
    expect(updated?.name).toBe('Updated Main Category');
    expect(updated?.color).toBe('#ffffff');
  });

  it('DELETE /api/category/:id should cascade delete subcategories', async () => {
    // We have 'Updated Main Category' -> 'Test Sub Category'
    // Deleting Parent should delete Child.

    const parent = await Category.findOne({
      where: { name: 'Updated Main Category', userId },
    });
    if (!parent) throw new Error('Parent not found for delete test');

    const res = await agent.delete(`/api/category/${parent.id}`);
    expect(res.status).toBe(StatusCodes.OK);

    // Verify Parent Gone
    const checkParent = await Category.findByPk(parent.id);
    expect(checkParent).toBeNull();

    // Verify Child Gone (Cascade)
    const child = await Category.findOne({
      where: { name: 'Test Sub Category' }, // Should imply constraint/userId?
    });
    // Note: check logic carefully.
    expect(child).toBeNull();
  });
});
