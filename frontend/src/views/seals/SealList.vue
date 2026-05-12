<template>
  <div class="seal-list">
    <div class="page-header">
      <h2>印章管理</h2>
    </div>

    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="印章名称">
          <el-input v-model="searchForm.name" placeholder="请输入印章名称" clearable />
        </el-form-item>
        <el-form-item label="印章类型">
          <el-select v-model="searchForm.type" placeholder="请选择" clearable>
            <el-option label="公章" value="official" />
            <el-option label="法人章" value="legal" />
            <el-option label="财务章" value="finance" />
            <el-option label="合同章" value="contract" />
            <el-option label="部门章" value="department" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable>
            <el-option label="正常" value="active" />
            <el-option label="停用" value="inactive" />
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
        <el-button type="primary" @click="openDialog()">新增印章</el-button>
      </div>

      <el-table :data="tableData" border stripe>
        <el-table-column prop="name" label="印章名称" />
        <el-table-column prop="type" label="印章类型">
          <template #default="{ row }">
            {{ getTypeName(row.type) }}
          </template>
        </el-table-column>
        <el-table-column prop="keeper_name" label="保管人" />
        <el-table-column prop="start_date" label="启用时间" />
        <el-table-column prop="location" label="存放位置" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="imprint_path" label="印模">
          <template #default="{ row }">
            <el-image v-if="row.imprint_path" :src="row.imprint_path" style="width: 40px; height: 40px" fit="contain" :preview-src-list="[row.imprint_path]" />
            <span v-else>-</span>
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

    <el-dialog v-model="dialogVisible" :title="editId ? '编辑印章' : '新增印章'" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="印章名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入印章名称" />
        </el-form-item>
        <el-form-item label="印章类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择印章类型" style="width: 100%">
            <el-option label="公章" value="official" />
            <el-option label="法人章" value="legal" />
            <el-option label="财务章" value="finance" />
            <el-option label="合同章" value="contract" />
            <el-option label="部门章" value="department" />
          </el-select>
        </el-form-item>
        <el-form-item label="保管人" prop="keeper_name">
          <el-input v-model="form.keeper_name" placeholder="请输入保管人姓名" />
        </el-form-item>
        <el-form-item label="启用时间" prop="start_date">
          <el-date-picker v-model="form.start_date" type="date" placeholder="请选择启用时间" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="存放位置" prop="location">
          <el-input v-model="form.location" placeholder="请输入存放位置" />
        </el-form-item>
        <el-form-item label="印章印模">
          <el-upload
            class="upload-demo"
            :action="uploadUrl"
            :headers="uploadHeaders"
            :on-success="handleUploadSuccess"
            :show-file-list="false"
            accept="image/*"
          >
            <el-image v-if="form.imprint_path" :src="form.imprint_path" style="width: 100px; height: 100px" fit="contain" />
            <el-button v-else type="primary">上传印模</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="active">正常</el-radio>
            <el-radio value="inactive">停用</el-radio>
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

const searchForm = reactive({ name: '', type: '', status: '' })
const form = reactive({
  name: '',
  type: '',
  keeper_name: '',
  start_date: '',
  location: '',
  imprint_path: '',
  status: 'active',
  remark: ''
})

const rules = {
  name: [{ required: true, message: '请输入印章名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择印章类型', trigger: 'change' }]
}

const uploadUrl = '/api/seals'
const uploadHeaders = computed(() => ({ Authorization: `Bearer ${userStore.token}` }))

const getTypeName = (type) => {
  const map = { official: '公章', legal: '法人章', finance: '财务章', contract: '合同章', department: '部门章' }
  return map[type] || type
}

const loadData = async () => {
  try {
    const params = {}
    if (searchForm.name) params.name = searchForm.name
    if (searchForm.type) params.type = searchForm.type
    if (searchForm.status) params.status = searchForm.status
    tableData.value = await api.get('/seals', { params })
  } catch (e) {
    console.error(e)
  }
}

const resetSearch = () => {
  searchForm.name = ''
  searchForm.type = ''
  searchForm.status = ''
  loadData()
}

const openDialog = (row) => {
  editId.value = row?.id || null
  if (row) {
    Object.assign(form, row)
  } else {
    Object.assign(form, { name: '', type: '', keeper_name: '', start_date: '', location: '', imprint_path: '', status: 'active', remark: '' })
  }
  dialogVisible.value = true
}

const handleUploadSuccess = (response) => {
  form.imprint_path = response.path
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    const formData = new FormData()
    Object.keys(form).forEach(key => {
      if (form[key]) formData.append(key, form[key])
    })

    if (editId.value) {
      await api.put(`/seals/${editId.value}`, form)
      ElMessage.success('修改成功')
    } else {
      await api.post('/seals', form)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (e) {
    console.error(e)
  }
}

const handleDelete = async (id) => {
  await ElMessageBox.confirm('确定要删除该印章吗？', '提示', { type: 'warning' })
  try {
    await api.delete(`/seals/${id}`)
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
