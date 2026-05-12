<template>
  <div class="application-list">
    <div class="page-header">
      <h2>用印申请</h2>
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
      <div style="margin-bottom: 15px">
        <el-button type="primary" @click="openDialog()">发起申请</el-button>
      </div>

      <el-table :data="tableData" border stripe>
        <el-table-column prop="seal_name" label="印章名称" />
        <el-table-column prop="applicant_name" label="申请人" />
        <el-table-column prop="reason" label="用印事由" show-overflow-tooltip />
        <el-table-column prop="file_name" label="文件名称" show-overflow-tooltip />
        <el-table-column prop="copies" label="份数" width="80" />
        <el-table-column prop="scene" label="使用场景" />
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
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">查看</el-button>
            <el-button v-if="row.status === 'rejected'" type="warning" link @click="openDialog(row)">修改</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" title="用印申请" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="印章" prop="seal_id">
          <el-select v-model="form.seal_id" placeholder="请选择印章" style="width: 100%">
            <el-option v-for="seal in sealList" :key="seal.id" :label="seal.name" :value="seal.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="用印事由" prop="reason">
          <el-input v-model="form.reason" type="textarea" :rows="3" placeholder="请输入用印事由" />
        </el-form-item>
        <el-form-item label="文件名称" prop="file_name">
          <el-input v-model="form.file_name" placeholder="请输入用印文件名称" />
        </el-form-item>
        <el-form-item label="用印份数" prop="copies">
          <el-input-number v-model="form.copies" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="使用场景" prop="scene">
          <el-input v-model="form.scene" placeholder="请输入使用场景" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">提交申请</el-button>
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
            <p><strong>{{ flow.approver_name }}</strong> - {{ flow.node_order }}级审批</p>
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
const sealList = ref([])
const dialogVisible = ref(false)
const detailVisible = ref(false)
const detail = ref({})
const editId = ref(null)
const formRef = ref(null)

const searchForm = reactive({ status: '' })
const form = reactive({
  seal_id: '',
  reason: '',
  file_name: '',
  copies: 1,
  scene: ''
})

const rules = {
  seal_id: [{ required: true, message: '请选择印章', trigger: 'change' }],
  reason: [{ required: true, message: '请输入用印事由', trigger: 'blur' }],
  file_name: [{ required: true, message: '请输入文件名称', trigger: 'blur' }]
}

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
    const params = { applicant_id: userStore.userInfo.id }
    if (searchForm.status) params.status = searchForm.status
    tableData.value = await api.get('/applications', { params })
  } catch (e) {
    console.error(e)
  }
}

const loadSeals = async () => {
  try {
    sealList.value = await api.get('/seals?status=active')
  } catch (e) {
    console.error(e)
  }
}

const resetSearch = () => {
  searchForm.status = ''
  loadData()
}

const openDialog = (row) => {
  editId.value = row?.id || null
  if (row) {
    Object.assign(form, { seal_id: row.seal_id, reason: row.reason, file_name: row.file_name, copies: row.copies, scene: row.scene })
  } else {
    Object.assign(form, { seal_id: '', reason: '', file_name: '', copies: 1, scene: '' })
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    const data = { ...form, applicant_id: userStore.userInfo.id }
    if (editId.value) {
      await api.put(`/applications/${editId.value}`, data)
      ElMessage.success('修改成功')
    } else {
      await api.post('/applications', data)
      ElMessage.success('申请提交成功')
    }
    dialogVisible.value = false
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
  loadSeals()
})
</script>
