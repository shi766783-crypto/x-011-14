<script setup lang="ts">
import type { PlanProgress, StudyPlan } from '@/types'

defineProps<{
  plan: StudyPlan
  progress: PlanProgress
  /** 归档区中的卡片：隐藏编辑/标记完成，主操作变为恢复 */
  archived?: boolean
}>()

const emit = defineEmits<{
  edit: [plan: StudyPlan]
  remove: [plan: StudyPlan]
  toggleComplete: [id: string]
  archive: [id: string]
  unarchive: [id: string]
}>()

const statusTagType: Record<string, 'info' | 'success' | 'danger' | 'primary'> = {
  未开始: 'info',
  进行中: 'primary',
  已完成: 'success',
  已逾期: 'danger',
}
</script>

<template>
  <el-card class="plan-card" :class="{ 'is-archived': archived }" shadow="hover">
    <div class="plan-head">
      <div class="plan-title">
        <span class="plan-name">{{ plan.name }}</span>
        <el-tag size="small" :type="statusTagType[progress.status]">{{ progress.status }}</el-tag>
        <el-tag v-if="archived" size="small" type="info" effect="plain">已归档</el-tag>
      </div>
      <el-tag size="small" effect="plain">{{ plan.domain }}</el-tag>
    </div>

    <p class="plan-goal">{{ plan.goal || '暂无目标描述' }}</p>

    <el-progress
      :percentage="progress.percent"
      :status="progress.status === '已逾期' ? 'exception' : progress.status === '已完成' ? 'success' : undefined"
      :stroke-width="12"
    />

    <div class="plan-meta">
      <span>已过 {{ progress.elapsedDays }} 天</span>
      <span>剩余 {{ progress.remainingDays }} 天</span>
      <span>应完成 {{ progress.shouldHours }}h</span>
      <span>实际 {{ progress.actualHours }}h / {{ plan.totalHours }}h</span>
    </div>

    <div class="plan-resources" v-if="plan.resources.length">
      <el-link
        v-for="r in plan.resources"
        :key="r.id"
        type="primary"
        :href="r.link || undefined"
        :target="r.link ? '_blank' : undefined"
        class="resource-link"
      >
        {{ r.name }}
      </el-link>
    </div>

    <div class="plan-actions">
      <template v-if="archived">
        <el-button size="small" type="warning" plain @click="emit('unarchive', plan.id)">恢复</el-button>
      </template>
      <template v-else>
        <el-button size="small" @click="emit('edit', plan)">编辑</el-button>
        <el-button
          v-if="progress.status !== '已完成'"
          size="small"
          type="success"
          @click="emit('toggleComplete', plan.id)"
        >
          标记完成
        </el-button>
        <el-button
          v-else
          size="small"
          type="info"
          plain
          @click="emit('archive', plan.id)"
        >
          归档
        </el-button>
      </template>
      <el-popconfirm title="确定删除该计划？" @confirm="emit('remove', plan)">
        <template #reference>
          <el-button size="small" type="danger">删除</el-button>
        </template>
      </el-popconfirm>
    </div>
  </el-card>
</template>

<style scoped>
.plan-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.plan-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2d3d;
}

.is-archived .plan-name {
  color: #909399;
}

.plan-goal {
  color: #606266;
  font-size: 13px;
  min-height: 36px;
  margin: 8px 0 12px;
}

.plan-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #909399;
  margin-top: 10px;
}

.plan-resources {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.resource-link {
  font-size: 12px;
}

.plan-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
</style>
