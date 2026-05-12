<template>
  <div class="license-list">
    <div class="page-header">
      <h2>证照管理</h2>
    </div>

    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="证照名称">
          <el-input v-model="searchForm.name" placeholder="请输入证照名称" clearable />
        </el-form-item>
        <el-form-item label="保管部门">
          <el-input v-model="searchForm.department" placeholder="请输入保管部门" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable>
            <el-option label="有效" value="valid" />
            <el-option label="即将过期" value="expiring" />
            <el-option label="已过期" value="expired" />
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
        <el-button type="primary" @click="openDialog()">新增证照</el-button>
      </div>

      <el-table :data="tableData" border stripe>
        <el-table-column prop="name" label="证照名称" />
        <el-table-column prop="license_no" label="证照编号" />
        <el-table-column prop="issuer" label="发证机关" />
        <el-table-column prop="issue_date" label="生效日期" />
        <el-table-column prop="expiry_date" label="有效期限" />
        <el-table-column prop="department" label="保管部门" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDialog(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editId ? '编辑证照' : '新增证照'" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="证照名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入证照名称" />
        </el-form-item>
        <el-form-item label="证照编号" prop="license_no">
          <el-input v-model="form.license_no" placeholder="请输入证照编号" />
        </el-form-item>
        <el-form-item label="发证机关" prop="issuer">
          <el-input v-model="form.issuer" placeholder="请输入发证机关" />
        </el-form-item>
        <el-form-item label="生效日期" prop="issue_date">
          <el-date-picker v-model="form.issue_date" type="date" placeholder="请选择生效日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="有效期限" prop="expiry_date">
          <el-date-picker v-model="form.expiry_date" type="date" placeholder="请选择有效期限" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="保管部门" prop="department">
          <el-input v-model="form.department" placeholder="请输入保管部门" />
        </el-form-item>
        <el-form-item label="证照文件">
          <el-upload
            class="upload-demo"
            :action="uploadUrl"
            :headers="uploadHeaders"
            :on-success="handleUploadSuccess"
            :show-file-list="false"
          >
            <el-button type="primary">上传文件</el-button>
            <span v-if="form.file_path" style="margin-left: 10px">已上传</span>
          </el-upload>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="valid">有效</el-radio>
            <el-radio value="expired">已过期</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../../utils/api'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const tableData = ref([])
const dialogVisible = ref(false)
const editId = ref(null)
const formRef = ref(null)

const searchForm = reactive({ name: '', department: '', status: '' })
const form = reactive({
  name: '',
  license_no: '',
  issuer: '',
  issue_date: '',
  expiry_date: '',
  department: '',
  file_path: '',
  status: 'valid',
  remark: ''
})

const rules = {
  name: [{ required: true, message: '请输入证照名称', trigger: 'blur' }]
}

const uploadUrl = '/api/licenses'
const uploadHeaders = computed(() => ({ Authorization: `Bearer ${userStore.token}` }))

const getStatusType = (status) => {
  const map = { valid: 'success', expiring: 'warning', expired: 'danger' }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = { valid: '有效', expiring: '即将过期', expired: '已过期' }
  return map[status] || status
}

const loadData = async () => {
  try {
    const params = {}
    if (searchForm.name) params.name = searchForm.name
    if (searchForm.department) params.department = searchForm.department
    if (searchForm.status) params.status = searchForm.status
    tableData.value = await api.get('/licenses', { params })
  } catch (e) {
    console.error(e)
  }
}

const resetSearch = () => {
  searchForm.name = ''
  searchForm.department = ''
  searchForm.status = ''
  loadData()
}

const openDialog = (row) => {
  editId.value = row?.id || null
  if (row) {
    Object.assign(form, row)
  } else {
    Object.assign(form, { name: '', license_no: '', issuer: '', issue_date: '', expiry_date: '', department: '', file_path: '', status: 'valid', remark: '' })
  }
  dialogVisible.value = true
}

const handleUploadSuccess = (response) => {
  form.file_path = response.path
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    if (editId.value) {
      await api.put(`/licenses/${editId.value}`, form)
      ElMessage.success('修改成功')
    } else {
      await api.post('/licenses', form)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (e) {
    console.error(e)
  }
}

const handleDelete = async (id) => {
  await ElMessageBox.confirm('确定要删除该证照吗？', '提示', { type: 'warning' })
  try {
    await api.delete(`/licenses/${id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  loadData()
})
</script>
