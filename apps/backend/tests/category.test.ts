import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Category from '@/models/category';
import { RootType } from '@repo/shared';
import { StatusCodes } from 'http-status-codes';

describe('Category API Integration Test', () => {
  const agent = request.agent(app);
  const userEmail = process.env.TEST_USER_EMAIL;
  const userPassword = process.env.TEST_USER_PASSWORD;
  let userId = '';

  if (!userEmail || !userPassword) {
    throw new Error(
      '請在 apps/backend/.env (或 frontend/.env) 設定 TEST_USER_EMAIL 與 TEST_USER_PASSWORD'
    );
  }

  beforeAll(async () => {
    // Login
    const loginRes = await agent.post('/api/login').send({
      email: userEmail,
      password: userPassword,
    });

    if (loginRes.status !== StatusCodes.OK) {
      throw new Error('Login failed: ' + JSON.stringify(loginRes.body));
    }

    const user = await User.findOne({ where: { email: userEmail } });
    if (!user) throw new Error('User not found');
    userId = user.id;
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
    const newMainCategory = {
      name: 'Test Main Category',
      type: RootType.EXPENSE,
      parentId: null,
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
    expect(created?.parentId).toBeNull();

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
