import { Tabs } from 'antd';
import ExcelTab from './components/ExcelTab';
import FilesTab from './components/FilesTab';
import './Documents.css';

const Documents = () => {
  return (
    <div>
      <div className="page-header">
        <h1>文件檔案</h1>
      </div>
      <Tabs
        items={[
          { key: 'files', label: '文件檔案', children: <FilesTab /> },
          { key: 'excel', label: 'Excel 匯入／匯出', children: <ExcelTab /> },
        ]}
      />
    </div>
  );
};

export default Documents;
