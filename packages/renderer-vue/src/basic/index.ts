/**
 * 普通 Basic UI 组件索引。
 *
 * 职责：
 * - 导出不感知 A2UI 的 Vue Basic 组件
 * - 提供 RenderNode type 到 Vue component 的映射
 *
 * 不负责：注册 legacy A2UI Basic 组件或解析 ComponentModel。
 */

import type { Component } from "vue";
import Text from "./Text.vue";
import Image from "./Image.vue";
import Icon from "./Icon.vue";
import Video from "./Video.vue";
import AudioPlayer from "./AudioPlayer.vue";
import Divider from "./Divider.vue";
import Row from "./Row.vue";
import Column from "./Column.vue";
import Grid from "./Grid.vue";
import Container from "./Container.vue";
import Spacer from "./Spacer.vue";
import List from "./List.vue";
import Card from "./Card.vue";
import Tabs from "./Tabs.vue";
import Button from "./Button.vue";
import TextField from "./TextField.vue";
import CheckBox from "./CheckBox.vue";
import ChoicePicker from "./ChoicePicker.vue";
import Slider from "./Slider.vue";
import DateTimeInput from "./DateTimeInput.vue";

export const basicUiComponents = new Map<string, Component>([
  ["Text", Text],
  ["Image", Image],
  ["Icon", Icon],
  ["Video", Video],
  ["AudioPlayer", AudioPlayer],
  ["Divider", Divider],
  ["Row", Row],
  ["Column", Column],
  ["Grid", Grid],
  ["Container", Container],
  ["Spacer", Spacer],
  ["List", List],
  ["Card", Card],
  ["Tabs", Tabs],
  ["Button", Button],
  ["TextField", TextField],
  ["CheckBox", CheckBox],
  ["ChoicePicker", ChoicePicker],
  ["Slider", Slider],
  ["DateTimeInput", DateTimeInput],
]);

export {
  AudioPlayer,
  Button,
  Card,
  CheckBox,
  ChoicePicker,
  Column,
  Container,
  DateTimeInput,
  Divider,
  Grid,
  Icon,
  Image,
  List,
  Row,
  Slider,
  Spacer,
  Tabs,
  Text,
  TextField,
  Video,
};
