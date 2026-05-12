<template>
  <div class="dashboard">
    <div class="page-header">
      <h2>系统概览</h2>
    </div>
    
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" style="color: #409EFF"><Stamp /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.sealCount }}</div>
              <div class="stat-label">印章总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" style="color: #67C23A"><Document /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.licenseCount }}</div>
              <div class="stat-label">证照总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" style="color: #E6A23C"><EditPen /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingCount }}</div>
              <div class="stat-label">待审批申请</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon" style="color: #F56C6C"><Warning /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.overdueCount }}</div>
              <div class="stat-label">逾期未还</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>最近用印申请</span>
          </template>
          <el-table :data="recentApplications" style="width: 100%">
            <el-table-column prop="seal_name" label="印章名称" />
            <el-table-column prop="applicant_name" label="申请人" />
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="申请时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>逾期预警</span>
          </template>
          <el-table :data="overdueList" style="width: 100%">
            <el-table-column prop="seal_name" label="印章名称" />
            <el-table-column prop="borrower_name" label="借用人" />
            <el-table-column prop="return_deadline" label="应还时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.return_deadline) }}
              </template>
            </el-table-column>
            <el-table-column label="逾期天数">
              <template #default="{ row }">
                <el-tag type="danger">{{ getOverdueDays(row.return_deadline) }}天</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../utils/api'

const stats = ref({
  sealCount: 0,
  licenseCount: 0,
  pendingCount: 0,
  overdueCount: 0
})

const recentApplications = ref([])
const overdueList = ref([])

const getStatusType = (status) => {
  const map = { pending: 'warning', approved: 'success', rejected: 'danger' }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = { pending: '待审批', approved: '已通过', rejected: '已驳回' }
  return map[status] || status
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const getOverdueDays = (deadline) => {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  return Math.floor((now - deadlineDate) / (1000 * 60 * 60 * 24))
}

const loadData = async () => {
  try {
    const [seals, licenses, applications, overdue] = await Promise.all([
      api.get('/seals'),
      api.get('/licenses'),
      api.get('/applications?status=pending'),
      api.get('/borrows/overdue')
    ])
    
    stats.value.sealCount = seals.length
    stats.value.licenseCount = licenses.length
    stats.value.pendingCount = applications.length
    stats.value.overdueCount = overdue.length
    
    recentApplications.value = applications.slice(0, 5)
    overdueList.value = overdue.slice(0, 5)
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.stat-card {
  cursor: pointer;
}

.stat-content {
  display: flex;
  align-items: center;
}

.stat-icon {
  font-size: 48px;
  margin-right: 20px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}
</style>
