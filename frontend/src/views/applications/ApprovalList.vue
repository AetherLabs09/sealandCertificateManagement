<template>
  <div class="approval-list">
    <div class="page-header">
      <h2>审批管理</h2>
    </div>

    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="申请状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable>
            <el-option label="待审批" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-container">
      <el-table :data="tableData" border stripe>
        <el-table-column prop="seal_name" label="印章名称" />
        <el-table-column prop="applicant_name" label="申请人" />
        <el-table-column prop="reason" label="用印事由" show-overflow-tooltip />
        <el-table-column prop="file_name" label="文件名称" show-overflow-tooltip />
        <el-table-column prop="copies" label="份数" width="80" />
        <el-table-column prop="current_node" label="当前节点" width="100">
          <template #default="{ row }">
            第{{ row.current_node }}级
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" type="success" link @click="openApproval(row, 'approve')">通过</el-button>
            <el-button v-if="row.status === 'pending'" type="danger" link @click="openApproval(row, 'reject')">驳回</el-button>
            <el-button type="primary" link @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="approvalVisible" :title="approvalAction === 'approve' ? '审批通过' : '审批驳回'" width="500px">
      <el-form :model="approvalForm" ref="approvalFormRef" label-width="80px">
        <el-form-item label="审批意见">
          <el-input v-model="approvalForm.comment" type="textarea" :rows="3" placeholder="请输入审批意见（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approvalVisible = false">取消</el-button>
        <el-button :type="approvalAction === 'approve' ? 'success' : 'danger'" @click="handleApproval">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="申请详情" width="700px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="印章名称">{{ detail.seal_name }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ detail.applicant_name }}</el-descriptions-item>
        <el-descriptions-item label="用印事由" :span="2">{{ detail.reason }}</el-descriptions-item>
        <el-descriptions-item label="文件名称">{{ detail.file_name }}</el-descriptions-item>
        <el-descriptions-item label="用印份数">{{ detail.copies }}</el-descriptions-item>
        <el-descriptions-item label="使用场景">{{ detail.scene }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(detail.status)">{{ getStatusText(detail.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="申请时间" :span="2">{{ formatDate(detail.created_at) }}</el-descriptions-item>
      </el-descriptions>
      
      <div v-if="detail.flows && detail.flows.length" style="margin-top: 20px">
        <h4>审批流程</h4>
        <el-timeline>
          <el-timeline-item v-for="flow in detail.flows" :key="flow.id" :type="getFlowType(flow.action)">
            <p><strong>{{ flow.approver_name }}</strong> - 第{{ flow.node_order }}级审批</p>
            <p>动作: {{ getActionText(flow.action) }}</p>
            <p v-if="flow.comment">意见: {{ flow.comment }}</p>
            <p>{{ formatDate(flow.created_at) }}</p>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../../utils/api'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const tableData = ref([])
const approvalVisible = ref(false)
const detailVisible = ref(false)
const detail = ref({})
const approvalFormRef = ref(null)
const currentApplication = ref(null)
const approvalAction = ref('approve')

const searchForm = reactive({ status: '' })
const approvalForm = reactive({ comment: '' })

const getStatusType = (status) => {
  const map = { pending: 'warning', approved: 'success', rejected: 'danger' }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = { pending: '待审批', approved: '已通过', rejected: '已驳回' }
  return map[status] || status
}

const getFlowType = (action) => {
  const map = { approve: 'success', reject: 'danger' }
  return map[action] || 'primary'
}

const getActionText = (action) => {
  const map = { approve: '同意', reject: '驳回' }
  return map[action] || action
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const loadData = async () => {
  try {
    const params = {}
    if (searchForm.status) params.status = searchForm.status
    tableData.value = await api.get('/applications', { params })
  } catch (e) {
    console.error(e)
  }
}

const resetSearch = () => {
  searchForm.status = ''
  loadData()
}

const openApproval = (row, action) => {
  currentApplication.value = row
  approvalAction.value = action
  approvalForm.comment = ''
  approvalVisible.value = true
}

const handleApproval = async () => {
  try {
    await api.put(`/applications/${currentApplication.value.id}/approve`, {
      approver_id: userStore.userInfo.id,
      action: approvalAction.value,
      comment: approvalForm.comment
    })
    ElMessage.success(approvalAction.value === 'approve' ? '审批通过' : '已驳回')
    approvalVisible.value = false
    loadData()
  } catch (e) {
    console.error(e)
  }
}

const viewDetail = async (row) => {
  try {
    detail.value = await api.get(`/applications/${row.id}`)
    detailVisible.value = true
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  loadData()
})
</script>
