import ActionButton from 'action-button'
import Component from 'base-component'
import Icon from 'icon'
import React from 'react'
import XoWeekHeatmap from 'xo-week-heatmap'
import _ from 'messages'
import cloneDeep from 'lodash/cloneDeep'
import forEach from 'lodash/forEach'
import map from 'lodash/map'
import renderXoItem from 'render-xo-item'
import sortBy from 'lodash/sortBy'
import { Container, Row, Col } from 'grid'
import { error } from 'notification'
import { SelectHostVm } from 'select-objects'
import { createGetObjectsOfType } from 'selectors'
import {
  connectStore,
  formatSize
} from 'utils'
import {
  fetchHostStats,
  fetchVmStats
} from 'xo'

// ===================================================================

const METRICS_LOADING = 1
const METRICS_LOADED = 2

// ===================================================================

const updateLayers = (layers, metricKey) => {
  if (layers[metricKey] === undefined) {
    layers[metricKey] = 0
  }

  return ++layers[metricKey]
}

const getMetricValues = (metrics, metricKey) => (
  (metrics[metricKey] && metrics[metricKey].values) ||
  []  // Already fed or not.
)

const computeStatsAverage = (stats, {
  layers,
  metricKey,
  metrics,
  timestampStart,
  valuesRenderer
}) => {
  if (!stats) {
    return
  }

  const layer = updateLayers(layers, metricKey)
  const values = getMetricValues(metrics, metricKey)

  forEach(stats, (value, key) => {
    value = +value

    if (values[key] === undefined) {
      values.push({
        value,
        date: timestampStart + 3600000 * key
      })
    } else {
      values[key].value = (values[key].value * (layer - 1) + value) / layer
    }
  })

  metrics[metricKey] = {
    key: metricKey,
    values,
    renderer: valuesRenderer
  }
}

// ===================================================================

const computeCpusAverage = (cpus, params) => {
  forEach(cpus, (cpu, index) => {
    computeStatsAverage(cpu, {
      metricKey: `CPU ${index}`,
      ...params
    })
  })

  const nCpus = cpus.length

  if (!nCpus) {
    return
  }

  const { metrics } = params
  const cpusAvg = cloneDeep(metrics['CPU 0'].values)

  for (let i = 1; i < nCpus; i++) {
    forEach(metrics[`CPU ${i}`].values, (value, index) => {
      cpusAvg[index].value += value.value
    })
  }

  forEach(cpusAvg, value => { value.value /= nCpus })

  const allCpusKey = 'All CPUs'
  metrics[allCpusKey] = {
    key: allCpusKey,
    values: cpusAvg
  }
}

const computeVifsAverage = (vifs, params) => {
  forEach(vifs, (vifs, vifsType) => {
    const rw = (vifsType === 'rx') ? 'out' : 'in'

    forEach(vifs, (vif, index) => {
      computeStatsAverage(vif, {
        metricKey: `Network ${index} ${rw}`,
        valuesRenderer: formatSize,
        ...params
      })
    })
  })
}

const computePifsAverage = (pifs, params) => {
  forEach(pifs, (pifs, pifsType) => {
    const rw = (pifsType === 'rx') ? 'out' : 'in'

    forEach(pifs, (pif, index) => {
      computeStatsAverage(pif, {
        metricKey: `NIC ${index} ${rw}`,
        valuesRenderer: formatSize,
        ...params
      })
    })
  })
}

const computeXvdsAverage = (xvds, params) => {
  forEach(xvds, (xvds, xvdsType) => {
    const rw = (xvdsType === 'r') ? 'read' : 'write'

    forEach(xvds, (xvd, index) => {
      computeStatsAverage(xvd, {
        metricKey: `Disk ${index} ${rw}`,
        valuesRenderer: formatSize,
        ...params
      })
    })
  })
}

const computeLoadAverage = (load, params) => {
  computeStatsAverage(load, {
    metricKey: 'Load',
    ...params
  })
}

const computeMemoryUsedAverage = (memoryUsed, params) => {
  computeStatsAverage(memoryUsed, {
    metricKey: 'RAM used',
    valuesRenderer: formatSize,
    ...params
  })
}

// ===================================================================

const runningObjectsPredicate = object => object.power_state === 'Running'

const STATS_TYPE_TO_COMPUTE_FNC = {
  cpus: computeCpusAverage,
  vifs: computeVifsAverage,
  pifs: computePifsAverage,
  xvds: computeXvdsAverage,
  load: computeLoadAverage,
  memoryUsed: computeMemoryUsedAverage
}

@connectStore(() => {
  const getRunningHosts = createGetObjectsOfType('host').filter(
    [ runningObjectsPredicate ]
  ).sort()
  const getRunningVms = createGetObjectsOfType('VM').filter(
    [ runningObjectsPredicate ]
  ).sort()

  return {
    hosts: getRunningHosts,
    vms: getRunningVms
  }
})
export default class Stats extends Component {
  constructor (props) {
    super(props)
    this.state = {
      objects: [],
      predicate: runningObjectsPredicate
    }
  }

  _resetSelection = () => {
    this.setState({
      metricsState: undefined,
      metrics: undefined,
      selectedMetric: undefined,
      objects: [],
      predicate: runningObjectsPredicate
    })
  }

  _handleSelection = objects => {
    this.setState({
      metricsState: undefined,
      metrics: undefined,
      selectedMetric: undefined,
      objects,
      predicate: objects.length
        ? object => runningObjectsPredicate(object) && object.type === objects[0].type
        : runningObjectsPredicate
    })
  }

  _selectAllHosts = () => {
    this.setState({
      metricsState: undefined,
      metrics: undefined,
      selectedMetric: undefined,
      objects: this.props.hosts,
      predicate: object => runningObjectsPredicate(object) && object.type === 'host'
    })
  }

  _selectAllVms = () => {
    this.setState({
      metricsState: undefined,
      metrics: undefined,
      selectedMetric: undefined,
      objects: this.props.vms,
      predicate: object => runningObjectsPredicate(object) && object.type === 'VM'
    })
  }

  _validSelection = async () => {
    this.setState({ metricsState: METRICS_LOADING })

    const metrics = {}
    const layers = {}
    const { objects } = this.state

    const getStats = (objects[0].type === 'host' && fetchHostStats) || fetchVmStats

    await Promise.all(
      map(objects, object => {
        return getStats(object, 'hours')
          .then(result => {
            const { stats } = result

            if (stats === undefined) {
              throw new Error('No stats')
            }

            const params = {
              layers,
              metrics,
              timestampStart: (result.endTimestamp - 3600 * (stats.memory.length - 1)) * 1000
            }

            forEach(stats, (stats, type) => {
              const fnc = STATS_TYPE_TO_COMPUTE_FNC[type]

              if (fnc) {
                fnc(stats, params)
              }
            })
          })
          .catch(() => {
            error(
              _('statsDashboardGenericErrorTitle'),
              <span>
                {_('statsDashboardGenericErrorMessage')} {object.name_label || object.id}
              </span>
            )
          })
      })
    )

    this.setState({
      metricsState: METRICS_LOADED,
      metrics: sortBy(metrics, metric => metric.key)
    })
  }

  _handleSelectedMetric = event => {
    const { value } = event.target
    this.setState({
      selectedMetric: value !== '' && this.state.metrics[value]
    })
  }

  render () {
    const {
      metricsState,
      metrics,
      objects,
      predicate,
      selectedMetric
    } = this.state

    return (
      <div>
        <Container>
          <Row>
            <Col mediumSize={6}>
              <SelectHostVm
                multi
                onChange={this._handleSelection}
                predicate={predicate}
                value={objects}
              />
              <div className='btn-group m-t-1' role='group'>
                <button
                  className='btn btn-secondary'
                  onClick={this._resetSelection}
                  type='button'
                >
                  <Icon icon='remove' />
                </button>
                <button
                  className='btn btn-secondary'
                  onClick={this._selectAllHosts}
                  type='button'
                >
                  <Icon icon='host' />
                </button>
                <button
                  className='btn btn-secondary'
                  onClick={this._selectAllVms}
                  type='button'
                >
                  <Icon icon='vm' />
                </button>
                <ActionButton
                  btnStyle='secondary'
                  disabled={!objects.length}
                  handler={this._validSelection}
                  icon='success'
                >
                  {_('statsDashboardSelectObjects')}
                </ActionButton>
              </div>
            </Col>
            <Col mediumSize={6}>
              {metricsState === METRICS_LOADING
                ? (
                <div>
                  <Icon icon='loading' /> {_('metricsLoading')}
                </div>
                ) : (metricsState === METRICS_LOADED &&
                  <select className='form-control' onChange={this._handleSelectedMetric}>
                    {_('noSelectedMetric', message => <option value=''>{message}</option>)}
                    {map(metrics, (metric, key) => (
                      <option key={key} value={key}>{metric.key}</option>
                    ))}
                  </select>
              )}
            </Col>
          </Row>
        </Container>
        <hr />
        {selectedMetric && (
          <Container>
            <Row>
              <Col>
                {map(objects, object => renderXoItem(object, { className: 'm-r-1' }))}
              </Col>
            </Row>
            <Row>
              <Col>
                <XoWeekHeatmap
                  data={selectedMetric.values}
                  cellRenderer={selectedMetric.renderer}
                />
              </Col>
            </Row>
          </Container>
        )}
      </div>
    )
  }
}
