-- 添加user_id和plan_name的组合唯一性约束
-- 确保同一用户的计划名称不会重复
ALTER TABLE travel_plans
ADD CONSTRAINT unique_user_plan_name UNIQUE (user_id, plan_name);

-- 可选：如果之前的操作失败，可能是因为已存在重复数据
-- 以下查询可以帮助查找重复数据
-- SELECT user_id, plan_name, COUNT(*) as count
-- FROM travel_plans
-- GROUP BY user_id, plan_name
-- HAVING COUNT(*) > 1;

-- 执行完上述查询后，可以决定如何处理重复数据
-- 例如，可以删除重复记录或重命名它们
-- DELETE FROM travel_plans
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, plan_name ORDER BY created_at) as row_num
--     FROM travel_plans
--   ) t
--   WHERE t.row_num > 1
-- );