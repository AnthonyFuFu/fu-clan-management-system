import { Card, Col, Row, Typography } from 'antd';
import { AGE_COLOR, BRANCH_COLOR, FEMALE_COLOR, GENERATION_COLOR, MALE_COLOR, percent } from '../constants';
import CountBars from './CountBars';
import type { SectionProps } from './types';

const { Text, Title } = Typography;

// 在世宗親的世代、分支、性別與年齡分布
const StructureSection = ({ stats: s, loading }: SectionProps) => (
  <>
    <Title level={4} className="dashboard-section-title">
      在世宗親結構
    </Title>
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={8}>
        <Card loading={loading} title="世代分布" className="dashboard-card">
          {s && <CountBars rows={s.generationCounts} color={GENERATION_COLOR} />}
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card loading={loading} title="分支人數" className="dashboard-card">
          {s && <CountBars rows={s.branchCounts} color={BRANCH_COLOR} />}
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card loading={loading} title="性別與年齡" className="dashboard-card">
          {s && (
            <>
              <div className="dashboard-gender-bar" title="男女比例">
                <div style={{ flex: s.maleCount, background: MALE_COLOR }} />
                <div style={{ flex: s.femaleCount, background: FEMALE_COLOR }} />
              </div>
              <div className="dashboard-gender-legend">
                <Text>
                  <span style={{ color: MALE_COLOR }}>●</span> 男 {s.maleCount} 人（
                  {percent(s.maleCount, s.livingCount)}%）
                </Text>
                <Text>
                  <span style={{ color: FEMALE_COLOR }}>●</span> 女 {s.femaleCount} 人（
                  {percent(s.femaleCount, s.livingCount)}%）
                </Text>
              </div>
              <CountBars rows={s.ageGroups} color={AGE_COLOR} emptyText="沒有生日資料" />
              {s.missingBirthdayCount > 0 && <Text type="secondary">另有 {s.missingBirthdayCount} 人未填生日</Text>}
            </>
          )}
        </Card>
      </Col>
    </Row>
  </>
);

export default StructureSection;
