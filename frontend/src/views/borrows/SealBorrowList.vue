<template>
  <div class="seal-borrow-list">
    <div class="page-header">
      <h2>印章借还管理</h2>
    </div>

    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable>
            <el-option label="借出中" value="borrowed" />
            <el-option label="已归还" value="returned" />
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
        <el-button type="primary" @click="openBorrowDialog()">借出登记</el-button>
      </div>

      <el-table :data="tableData" border stripe>
        <el-table-column prop="seal_name" label="印章名称" />
        <el-table-column prop="borrower_name" label="借用人" />
        <el-table-column prop="borrow_time" label="借出时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.borrow_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="purpose" label="外出用途" show-overflow-tooltip />
        <el-table-column prop="return_deadline" label="归还时限" width="180">
          <template #default="{ row }">
            {{ formatDate(row.return_deadline) }}
          </template>
        </el-table-column>
        <el-table-column prop="actual_return_time" label="实际归还时间" width="180">
          <template #default="{ row }">
            {{ row.actual_return_time ? formatDate(row.actual_return_time) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'borrowed' ? 'warning' : 'success'">
              {{ row.status === 'borrowed' ? '借出中' : '已归还' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button v-if="row.status === 'borrowed'" type="success" link @click="openReturnDialog(row)">归还登记</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="borrowDialogVisible" title="印章借出登记" width="500px">
      <el-form :model="borrowForm" :rules="borrowRules" ref="borrowFormRef" label-width="100px">
        <el-form-item label="印章" prop="seal_id">
          <el-select v-model="borrowForm.seal_id" placeholder="请选择印章" style="width: 100%">
            <el-option v-for="seal in sealList" :key="seal.id" :label="seal.name" :value="seal.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="借出时间" prop="borrow_time">
          <el-date-picker v-model="borrowForm.borrow_time" type="datetime" placeholder="请选择借出时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="外出用途" prop="purpose">
          <el-input v-model="borrowForm.purpose" type="textarea" :rows="2" placeholder="请输入外出用途" />
        </el-form-item>
        <el-form-item label="归还时限" prop="return_deadline">
          <el-date-picker v-model="borrowForm.return_deadline" type="datetime" placeholder="请选择归还时限" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="borrowForm.remark" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="borrowDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBorrow">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="returnDialogVisible" title="归还登记" width="500px">
      <el-form :model="returnForm" ref="returnFormRef" label-width="100px">
        <el-form-item label="归还时间">
          <el-date-picker v-model="returnForm.return_time" type="datetime" placeholder="请选择归还时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="returnForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="returnDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleReturn">确定</el-button>
      </template>
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
const borrowDialogVisible = ref(false)
const returnDialogVisible = ref(false)
const borrowFormRef = ref(null)
const returnFormRef = ref(null)
const currentBorrow = ref(null)

const searchForm = reactive({ status: '' })
const borrowForm = reactive({
  seal_id: '',
  borrow_time: '',
  purpose: '',
  return_deadline: '',
  remark: ''
})
const returnForm = reactive({
  return_time: '',
  remark: ''
})

const borrowRules = {
  seal_id: [{ required: true, message: '请选择印章', trigger: 'change' }],
  borrow_time: [{ required: true, message: '请选择借出时间', trigger: 'change' }],
  purpose: [{ required: true, message: '请输入外出用途', trigger: 'blur' }],
  return_deadline: [{ required: true, message: '请选择归还时限', trigger: 'change' }]
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

const loadData = async () => {
  try {
    const params = {}
    if (searchForm.status) params.status = searchForm.status
    tableData.value = await api.get('/borrows/seals', { params })
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

const openBorrowDialog = () => {
  Object.assign(borrowForm, { seal_id: '', borrow_time: '', purpose: '', return_deadline: '', remark: '' })
  borrowDialogVisible.value = true
}

const handleBorrow = async () => {
  const valid = await borrowFormRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    await api.post('/borrows/seals', {
      ...borrowForm,
      borrower_id: userStore.userInfo.id
    })
    ElMessage.success('借出登记成功')
    borrowDialogVisible.value = false
    loadData()
  } catch (e) {
    console.error(e)
  }
}

const openReturnDialog = (row) => {
  currentBorrow.value = row
  returnForm.return_time = new Date().toISOString().slice(0, 19).replace('T', ' ')
  returnForm.remark = ''
  returnDialogVisible.value = true
}

const handleReturn = async () => {
  try {
    await api.put(`/borrows/seals/${currentBorrow.value.id}/return`, returnForm)
    ElMessage.success('归还登记成功')
    returnDialogVisible.value = false
    loadData()
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  loadData()
  loadSeals()
})
</script>
