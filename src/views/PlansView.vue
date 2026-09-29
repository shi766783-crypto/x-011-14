<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import type { Domain, StudyPlan, StudyResource } from '@/types'
import { DOMAINS } from '@/constants'
import { computePlanProgress } from '@/utils/progress'
import { today } from '@/utils/date'
import { uid } from '@/utils/id'
import { useLogsStore } from '@/stores/logs'
import { usePlansStore } from '@/stores/plans'
import PlanCard from '@/components/PlanCard.vue'

const plansStore = usePlansStore()
const logsStore = useLogsStore()

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()

/** 归档区默认折叠，随时可展开 */
const archiveExpanded = ref(false)

const emptyForm = (): {
  name: string
  domain: Domain
  goal: string
  startDate: string
  endDate: string
  totalHours: number
  dailyHours: number
  resources: StudyResource[]
} => ({
  name: '',
  domain: '编程',
  goal: '',
  startDate: today(),
  endDate: '',
  totalHours: 100,
  dailyHours: 2,
  resources: [],
})

const form = reactive(emptyForm())

const rules: FormRules = {
  name: [{ required: true, message: '请输入计划名称', trigger: 'blur' }],
  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  totalHours: [{ required: true, message: '请输入预计总学时', trigger: 'blur' }],
  dailyHours: [{ required: true, message: '请输入每日学习时长', trigger: 'blur' }],
}

/** 已完成状态排到主列表末尾，进行中/未开始/已逾期优先展示 */
const statusRank = (status: string): number => (status === '已完成' ? 1 : 0)

/** 主列表：归档计划被隐藏；分组内保持创建顺序（新计划在前） */
const activeViews = computed(() =>
  plansStore.plans
    .filter((plan) => !plan.archivedAt)
    .map((plan) => ({ plan, progress: computePlanProgress(plan, logsStore.logs) }))
    .sort((a, b) => statusRank(a.progress.status) - statusRank(b.progress.status)),
)

/** 归档区：仅包含已归档计划 */
const archivedViews = computed(() =>
  plansStore.plans
    .filter((plan) => plan.archivedAt)
    .map((plan) => ({ plan, progress: computePlanProgress(plan, logsStore.logs) })),
)

function openCreate(): void {
  editingId.value = null
  Object.assign(form, emptyForm())
  dialogVisible.value = true
}

function openEdit(plan: StudyPlan): void {
  editingId.value = plan.id
  Object.assign(form, {
    name: plan.name,
    domain: plan.domain,
    goal: plan.goal,
    startDate: plan.startDate,
    endDate: plan.endDate,
    totalHours: plan.totalHours,
    dailyHours: plan.dailyHours,
    resources: plan.resources.map((r) => ({ ...r })),
  })
  dialogVisible.value = true
}

function addResource(): void {
  form.resources.push({ id: uid(), name: '', link: '' })
}

function removeResource(index: number): void {
  form.resources.splice(index, 1)
}

async function save(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  const payload = {
    name: form.name.trim(),
    domain: form.domain,
    goal: form.goal.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    totalHours: form.totalHours,
    dailyHours: form.dailyHours,
    resources: form.resources.filter((r) => r.name.trim() !== ''),
  }
  if (editingId.value) {
    plansStore.updatePlan(editingId.value, payload)
    ElMessage.success('计划已更新')
  } else {
    plansStore.addPlan(payload)
    ElMessage.success('计划已创建')
  }
  dialogVisible.value = false
}

function removePlan(plan: StudyPlan): void {
  plansStore.removePlan(plan.id)
}

function archivePlan(id: string): void {
  plansStore.archivePlan(id)
  ElMessage.success('已归档，可在页面底部归档区查看或恢复')
}

function unarchivePlan(id: string): void {
  plansStore.unarchivePlan(id)
  ElMessage.success('已恢复到计划列表')
}
</script>

<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">学习计划</h2>
      <el-button type="primary" @click="openCreate">新建计划</el-button>
    </div>

    <el-empty
      v-if="activeViews.length === 0 && archivedViews.length === 0"
      description="还没有学习计划，点击右上角新建"
    />
    <el-empty
      v-else-if="activeViews.length === 0"
      description="进行中/未开始的计划都完成了，去归档区看看吧"
    />

    <div v-if="activeViews.length" class="plan-list">
      <PlanCard
        v-for="{ plan, progress } in activeViews"
        :key="plan.id"
        :plan="plan"
        :progress="progress"
        @edit="openEdit"
        @toggle-complete="plansStore.toggleComplete"
        @archive="archivePlan"
        @remove="removePlan"
      />
    </div>

    <div v-if="archivedViews.length" class="archive-section">
      <button class="archive-toggle" type="button" @click="archiveExpanded = !archiveExpanded">
        <span class="archive-arrow" :class="{ 'is-open': archiveExpanded }">▸</span>
        <span class="archive-title">已归档（{{ archivedViews.length }}）</span>
        <span class="archive-hint">仅隐藏，不影响统计与成就</span>
      </button>

      <el-collapse-transition>
        <div v-show="archiveExpanded" class="plan-list archive-list">
          <PlanCard
            v-for="{ plan, progress } in archivedViews"
            :key="plan.id"
            :plan="plan"
            :progress="progress"
            archived
            @unarchive="unarchivePlan"
            @remove="removePlan"
          />
        </div>
      </el-collapse-transition>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑计划' : '新建计划'"
      width="560px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="计划名称" prop="name">
          <el-input v-model="form.name" placeholder="如：三个月攻克雅思" />
        </el-form-item>
        <el-form-item label="学习领域" prop="domain">
          <el-select v-model="form.domain" style="width: 100%">
            <el-option v-for="d in DOMAINS" :key="d" :label="d" :value="d" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标描述" prop="goal">
          <el-input v-model="form.goal" type="textarea" :rows="2" placeholder="描述你想达成的目标" />
        </el-form-item>
        <el-form-item label="开始日期" prop="startDate">
          <el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束日期" prop="endDate">
          <el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="预计总学时" prop="totalHours">
          <el-input-number v-model="form.totalHours" :min="1" :step="10" style="width: 100%" />
        </el-form-item>
        <el-form-item label="每日时长" prop="dailyHours">
          <el-input-number v-model="form.dailyHours" :min="0.5" :step="0.5" style="width: 100%" />
        </el-form-item>

        <el-form-item label="学习资源">
          <div class="resource-editor">
            <div v-for="(r, i) in form.resources" :key="r.id" class="resource-row">
              <el-input v-model="r.name" placeholder="资源名称" />
              <el-input v-model="r.link" placeholder="链接(可选)" />
              <el-button type="danger" plain @click="removeResource(i)">删除</el-button>
            </div>
            <el-button type="primary" plain @click="addResource">+ 添加资源</el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.plan-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.archive-section {
  margin-top: 28px;
}

.archive-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 16px;
  border: none;
  border-top: 1px solid #ebeef5;
  background: transparent;
  cursor: pointer;
  color: #606266;
  font-size: 14px;
}

.archive-toggle:hover {
  color: #409eff;
}

.archive-arrow {
  display: inline-block;
  transition: transform 0.2s ease;
  font-size: 12px;
}

.archive-arrow.is-open {
  transform: rotate(90deg);
}

.archive-title {
  font-weight: 600;
}

.archive-hint {
  margin-left: auto;
  font-size: 12px;
  color: #c0c4cc;
}

.archive-list {
  margin-bottom: 8px;
}

.resource-editor {
  width: 100%;
}

.resource-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
