import React, { useEffect, useState } from 'react';
import { Col, DatePicker, Form, Input, InputNumber, Modal, Radio, Row, Select, Switch, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import type { Branch, Gender, Member, MemberInput, MemberSummary } from '@shared/types';
import MemberSelect from '@/components/MemberSelect';
import { remountOnOpen } from '@/utils/remountOnOpen';
import { DATE_FORMAT } from '@/utils/format';
import { GENDER_LABEL } from '../constants';

const { Text } = Typography;

// 表單開啟的情境：新增、新增某人的子女（帶入父母）、修改既有成員
export type MemberFormState = { mode: 'create'; parent?: MemberSummary } | { mode: 'edit'; member: Member } | null;

interface MemberFormValues {
  name: string;
  gender: Gender;
  birthday?: Dayjs | null;
  parentId?: number | null;
  generation: number;
  spouseName?: string;
  job?: string;
  cellphone?: string;
  phoneNo?: string;
  branchId?: number | null;
  deceased?: boolean;
}

interface MemberFormModalProps {
  state: MemberFormState;
  branches: Branch[];
  onClose: () => void;
  onSubmit: (input: MemberInput) => Promise<void>;
}

function initialValues(state: NonNullable<MemberFormState>): Partial<MemberFormValues> {
  if (state.mode === 'edit') {
    const m = state.member;
    return {
      name: m.name,
      gender: m.gender,
      birthday: m.birthday ? dayjs(m.birthday) : null,
      parentId: m.parentId,
      generation: m.generation,
      spouseName: m.spouseName ?? '',
      job: m.job ?? '',
      cellphone: m.cellphone ?? '',
      phoneNo: m.phoneNo ?? '',
      branchId: m.branchId,
      deceased: m.deceased,
    };
  }
  return {
    gender: 'M',
    deceased: false,
    parentId: state.parent?.id ?? null,
    generation: state.parent ? state.parent.generation + 1 : 1,
  };
}

// The parent shown in the select before the user searches for anything.
function initialParent(state: NonNullable<MemberFormState>): MemberSummary | null {
  if (state.mode === 'create') {
    return state.parent ?? null;
  }
  const m = state.member;
  return m.parentId !== null ? { id: m.parentId, name: m.parentName ?? '', generation: m.generation - 1 } : null;
}

const MemberFormModal = ({ state, branches, onClose, onSubmit }: MemberFormModalProps) => {
  const [form] = Form.useForm<MemberFormValues>();
  const parentId = Form.useWatch('parentId', form);
  const [parentGeneration, setParentGeneration] = useState<number | null>(null);

  useEffect(() => {
    if (state) {
      setParentGeneration(initialParent(state)?.generation ?? null);
    }
  }, [state]);

  const editing = state?.mode === 'edit' ? state.member : null;
  const hasParent = parentId !== null && parentId !== undefined;
  const parentChanged = editing !== null && (parentId ?? null) !== editing.parentId;

  return (
    <Modal
      title={editing ? `修改成員：${editing.name}` : state?.mode === 'create' && state.parent ? `新增 ${state.parent.name} 的子女` : '新增成員'}
      open={state !== null}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="儲存"
      width={640}
      destroyOnHidden
    >
      {state && (
        <Form<MemberFormValues>
          form={form}
          layout="vertical"
          initialValues={initialValues(state)}
          onFinish={(v) =>
            onSubmit({
              name: v.name.trim(),
              gender: v.gender,
              birthday: v.birthday ? v.birthday.format(DATE_FORMAT) : null,
              parentId: v.parentId ?? null,
              generation: v.generation,
              spouseName: v.spouseName?.trim() || null,
              job: v.job?.trim() || null,
              cellphone: v.cellphone?.trim() || null,
              phoneNo: v.phoneNo?.trim() || null,
              branchId: v.branchId ?? null,
              deceased: v.deceased ?? false,
            })
          }
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true, whitespace: true, message: '請輸入姓名' }]}>
                <Input maxLength={50} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="gender" label="性別">
                <Radio.Group
                  optionType="button"
                  options={(['M', 'F'] as const).map((g) => ({ value: g, label: GENDER_LABEL[g] }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="deceased" label="狀態" valuePropName="checked" tooltip="已故者不會列入會費應繳名單">
                <Switch checkedChildren="已故" unCheckedChildren="在世" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="parentId"
                label="父親／母親"
                extra={parentChanged ? '更換父母後，此成員與所有子孫的世代會一起調整' : '始祖不需填寫'}
              >
                <MemberSelect
                  allowClear
                  initialOption={initialParent(state)}
                  // 不能選自己；選到自己的子孫時由資料庫拒絕並提示
                  disabledIds={editing ? [editing.id] : []}
                  onSelectMember={(member) => {
                    setParentGeneration(member?.generation ?? null);
                    if (member) form.setFieldValue('generation', member.generation + 1);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="generation"
                label="世代"
                rules={[{ required: true, message: '請輸入世代' }]}
                extra={hasParent && parentGeneration !== null ? '依父母自動計算' : undefined}
              >
                <InputNumber min={1} precision={0} prefix="第" suffix="世" disabled={hasParent} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="birthday" label="生日">
                <DatePicker format={DATE_FORMAT} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="branchId" label="分支">
                <Select allowClear placeholder="未分配" options={branches.map((b) => ({ value: b.id, label: b.name }))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="spouseName" label="配偶">
                <Input maxLength={50} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="job" label="職業">
                <Input maxLength={50} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="cellphone" label="手機">
                <Input maxLength={30} placeholder="0912-345-678" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phoneNo" label="電話">
                <Input maxLength={30} placeholder="04-2345-6789" />
              </Form.Item>
            </Col>
          </Row>

          {editing && (
            <Text type="secondary">成員編號：{editing.id}</Text>
          )}
        </Form>
      )}
    </Modal>
  );
};

// 每次開啟都用全新的表單，避免殘留上一次的內容（見 remountOnOpen）
export default remountOnOpen(MemberFormModal, (props) => props.state);
